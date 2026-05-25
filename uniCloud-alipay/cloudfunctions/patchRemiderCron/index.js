"use strict";

const db = uniCloud.database();

function getDayRange(inputDate) {
  const d = inputDate ? new Date(inputDate) : new Date();
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

async function ensureReminderAndDetailForTime({
  patientId,
  medicationTime,
  planId,
  medicationName,
  timeSlot,
  existingReminderByTime,
  now,
  stats,
}) {
  let reminderId;
  const existingReminder = existingReminderByTime[medicationTime];
  if (existingReminder) {
    reminderId = existingReminder._id;
  } else {
    const reminderRes = await db.collection("medication_reminders").add({
      user_id: patientId,
      medication_time: medicationTime,
      status: "pending",
      reminder_sent: false,
      create_date: now,
      update_date: now,
    });
    reminderId = reminderRes.id;
    existingReminderByTime[medicationTime] = { _id: reminderId };
    stats.insertedReminders += 1;
  }

  const dosageUnit = timeSlot.dosage_unit || "片";
  const notes = timeSlot.notes || "";
  const dosageAmount = timeSlot.dosage_amount;

  const existDetail = await db
    .collection("medication_reminder_details")
    .where({
      reminder_id: reminderId,
      medication_plan_id: planId,
      medication_name: medicationName,
      dosage_amount: dosageAmount,
      dosage_unit: dosageUnit,
    })
    .count();

  if (existDetail.total === 0) {
    await db.collection("medication_reminder_details").add({
      reminder_id: reminderId,
      medication_plan_id: planId,
      medication_name: medicationName,
      dosage_amount: dosageAmount,
      dosage_unit: dosageUnit,
      notes,
      create_date: now,
    });
    stats.insertedDetails += 1;
  }
}

exports.main = async (event, context) => {
  const now = Date.now();
  const { start, end } = getDayRange(event && event.date);

  console.log("[patchRemiderCron] 开始生成当日提醒", { start, end });

  const plansRes = await db
    .collection("medication_plan")
		.limit(1000)
    .get();
		
  const plans = plansRes.data.filter(item => new Date(item.end_date).getTime() >= start);
  console.log("[patchRemiderCron] 当日生效计划数:", plans.length);

  const stats = {
    dayStart: start,
    dayEnd: end,
    plansCount: plans.length,
    insertedReminders: 0,
    insertedDetails: 0,
    processedPatients: 0,
  };

  // 按患者分组，减少提醒查询次数
  const plansByPatient = {};
  for (const plan of plans) {
    if (!plansByPatient[plan.patient_id]) plansByPatient[plan.patient_id] = [];
    plansByPatient[plan.patient_id].push(plan);
  }

  const patientIds = Object.keys(plansByPatient);
  for (let i = 0; i < patientIds.length; i++) {
    const patientId = patientIds[i];
    const patientPlans = plansByPatient[patientId] || [];
    stats.processedPatients += 1;

    console.log(
      "[patchRemiderCron] 处理患者",
      i + 1,
      "/",
      patientIds.length,
      "patient_id:",
      patientId,
      "plans:",
      patientPlans.length
    );

    // 仅拉取该患者当日 reminders
    const remindersRes = await db
      .collection("medication_reminders")
      .where({
        user_id: patientId,
        medication_time: db.command.gte(start).and(db.command.lte(end)),
      })
      .get();
    const existingReminders = remindersRes.data || [];
    const existingReminderByTime = {};
    for (const r of existingReminders) {
      existingReminderByTime[r.medication_time] = r;
    }

    // 对该患者当日所有计划的时间槽逐个补齐
    for (const plan of patientPlans) {
      const timeSlots = plan.time_slots || [];
      for (const timeSlot of timeSlots) {
        const medicationTime = parseTimeSlotToTimestamp(start, timeSlot.time);
        await ensureReminderAndDetailForTime({
          patientId,
          medicationTime,
          planId: plan._id,
          medicationName: plan.medication_name,
          timeSlot,
          existingReminderByTime,
          now,
          stats,
        });
      }
    }
  }

  console.log("[patchRemiderCron] 生成完成:", JSON.stringify(stats));
  return {
    code: 0,
    message: "生成当日用药提醒完成",
    data: stats,
  };
};

