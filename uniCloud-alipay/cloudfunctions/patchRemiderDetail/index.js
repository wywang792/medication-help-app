// 手工检查/补齐：与 patchRemiderCron 同逻辑，但支持 event 参数控制，并可选择是否写库

"use strict";

const db = uniCloud.database();

const INSERT_BATCH_SIZE = 200;

function getDayRange(input) {
  const d = input ? new Date(input) : new Date();
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

function parseTimeSlotToTimestamp(dayStartTs, timeStr) {
  const d = new Date(dayStartTs);
  const parts = (timeStr || "0:0").split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

function chunkArray(arr, chunkSize) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) chunks.push(arr.slice(i, i + chunkSize));
  return chunks;
}

async function batchAdd(collectionName, docs) {
  if (!docs || docs.length === 0) return [];
  const batches = chunkArray(docs, INSERT_BATCH_SIZE);
  const ids = [];
  for (let i = 0; i < batches.length; i++) {
    const res = await db.collection(collectionName).add(batches[i]);
    ids.push(...(res.ids || []));
    console.log(
      "[patchRemiderDetail][WRITE]",
      collectionName,
      "写入批次",
      i + 1,
      "/",
      batches.length,
      "本批",
      batches[i].length,
      "累计",
      ids.length
    );
  }
  return ids;
}

exports.main = async (event, context) => {
  const now = Date.now();
  const write = event && event.write === true;
  const targetPatientId = event && event.patient_id ? event.patient_id : null;
  const { start, end } = getDayRange(event && event.date);

  console.log("[patchRemiderDetail] 开始检查/补齐", { start, end, write, targetPatientId });

  const plansRes = await db
    .collection("medication_plan")
    .where({
      ...(targetPatientId ? { patient_id: targetPatientId } : {}),
    })
    .limit(1000)
    .get();
		
	const plans = plansRes.data.filter(item => new Date(item.end_date).getTime() >= start);  
  console.log("[patchRemiderDetail] 当日生效计划数:", plans.length);

  const plansByPatient = {};
  for (const plan of plans) {
    if (!plansByPatient[plan.patient_id]) plansByPatient[plan.patient_id] = [];
    plansByPatient[plan.patient_id].push(plan);
  }
  const patientIds = Object.keys(plansByPatient);

  const toAddReminders = [];
  const toAddDetails = [];
  const reminderKeyToIndex = {};

  for (let pi = 0; pi < patientIds.length; pi++) {
    const patientId = patientIds[pi];
    const patientPlans = plansByPatient[patientId] || [];

    console.log("[patchRemiderDetail] 处理患者", pi + 1, "/", patientIds.length, patientId, "plans:", patientPlans.length);

    const remindersRes = await db
      .collection("medication_reminders")
      .where({
        user_id: patientId,
        medication_time: db.command.gte(start).and(db.command.lte(end)),
      })
      .get();
    const existingReminders = remindersRes.data || [];
    const existingReminderByTime = {};
    for (const r of existingReminders) existingReminderByTime[r.medication_time] = r;

    // 计算该患者当日应有的时间槽（可能多个 plan 共享同一时间点）
    const requiredTimes = new Set();
    const requiredDetailSpecs = [];
    for (const plan of patientPlans) {
      const timeSlots = plan.time_slots || [];
      for (const timeSlot of timeSlots) {
        const medicationTime = parseTimeSlotToTimestamp(start, timeSlot.time);
        requiredTimes.add(medicationTime);
        requiredDetailSpecs.push({
          medicationTime,
          planId: plan._id,
          medicationName: plan.medication_name,
          dosageAmount: timeSlot.dosage_amount,
          dosageUnit: timeSlot.dosage_unit || "片",
          notes: timeSlot.notes || "",
        });
      }
    }

    // reminders：缺失则加入待新增
    for (const medicationTime of requiredTimes) {
      if (!existingReminderByTime[medicationTime]) {
        const key = patientId + "_" + medicationTime;
        reminderKeyToIndex[key] = toAddReminders.length;
        toAddReminders.push({
          user_id: patientId,
          medication_time: medicationTime,
          status: "pending",
          reminder_sent: false,
          create_date: now,
          update_date: now,
        });
        // 先用占位，便于本轮 details 生成引用
        existingReminderByTime[medicationTime] = { _id: null, _placeholderKey: key };
      }
    }

    // details：先查已有 reminder_id 的详情键，避免重复插入
    const existingDetailKeys = {};
    for (const medicationTime of requiredTimes) {
      const rem = existingReminderByTime[medicationTime];
      if (!rem || !rem._id) continue;
      const detailsRes = await db
        .collection("medication_reminder_details")
        .where({ reminder_id: rem._id })
        .get();
      const details = detailsRes.data || [];
      for (const d of details) {
        const dk =
          d.reminder_id +
          "_" +
          d.medication_plan_id +
          "_" +
          d.medication_name +
          "_" +
          d.dosage_amount +
          "_" +
          (d.dosage_unit || "");
        existingDetailKeys[dk] = true;
      }
    }

    // 生成缺失 details（已有 reminder 用 reminder_id；新 reminder 用 reminder_index）
    for (const spec of requiredDetailSpecs) {
      const rem = existingReminderByTime[spec.medicationTime];
      if (!rem) continue;

      if (rem._id) {
        const dk =
          rem._id +
          "_" +
          spec.planId +
          "_" +
          spec.medicationName +
          "_" +
          spec.dosageAmount +
          "_" +
          (spec.dosageUnit || "");
        if (existingDetailKeys[dk]) continue;
        toAddDetails.push({
          reminder_id: rem._id,
          medication_plan_id: spec.planId,
          medication_name: spec.medicationName,
          dosage_amount: spec.dosageAmount,
          dosage_unit: spec.dosageUnit,
          notes: spec.notes,
          create_date: now,
        });
      } else if (rem._placeholderKey) {
        const idx = reminderKeyToIndex[rem._placeholderKey];
        if (idx === undefined) continue;
        toAddDetails.push({
          reminder_index: idx,
          medication_plan_id: spec.planId,
          medication_name: spec.medicationName,
          dosage_amount: spec.dosageAmount,
          dosage_unit: spec.dosageUnit,
          notes: spec.notes,
          create_date: now,
        });
      }
    }
  }

  const summary = {
    dayStart: start,
    dayEnd: end,
    plansCount: plans.length,
    patientsCount: patientIds.length,
    toAddRemindersCount: toAddReminders.length,
    toAddDetailsCount: toAddDetails.length,
  };
  console.log("[patchRemiderDetail] 汇总:", JSON.stringify(summary));

  if (!write) {
    return {
      code: 0,
      message: "检查完成（未写入）",
      data: {
        summary,
        toAddReminders,
        toAddDetails,
      },
    };
  }

  const newReminderIds = await batchAdd("medication_reminders", toAddReminders);
  const detailsToInsert = toAddDetails.map((d) => {
    if (d.reminder_index === undefined || d.reminder_index === null) return d;
    const mappedId = newReminderIds[d.reminder_index];
    if (!mappedId) {
      throw new Error(`reminder_index 映射失败：index=${d.reminder_index} newReminderIds.length=${newReminderIds.length}`);
    }
    const copy = { ...d, reminder_id: mappedId };
    delete copy.reminder_index;
    return copy;
  });
  const newDetailIds = await batchAdd("medication_reminder_details", detailsToInsert);

  const writeSummary = {
    insertedReminders: newReminderIds.length,
    insertedDetails: newDetailIds.length,
  };
  console.log("[patchRemiderDetail][WRITE] 写入完成:", JSON.stringify(writeSummary));

  return {
    code: 0,
    message: "补齐完成（已写入）",
    data: {
      summary,
      writeSummary,
    },
  };
};
