"use strict";

const db = uniCloud.database();
const { authenticate } = require("auth");

exports.main = async (event, context) => {
  // 验证token
  const authResult = await authenticate(event);
  if (!authResult.success) {
    return {
      code: authResult.code,
      message: authResult.message,
    };
  }

  const userInfo = authResult.userInfo;
  const { patient_id, medication_name, start_date, end_date, time_slots } =
    event;

  // 检查用户角色
  if (userInfo.role !== "medical" && userInfo.role !== "admin") {
    return {
      code: 403,
      message: "权限不足，只有医护人员可以添加用药",
    };
  }

  // 参数验证
  if (
    !patient_id ||
    !medication_name ||
    !start_date ||
    !end_date ||
    !time_slots
  ) {
    return {
      code: -1,
      message: "参数不完整",
    };
  }

  if (!Array.isArray(time_slots) || time_slots.length === 0) {
    return {
      code: -1,
      message: "用药时间不能为空",
    };
  }

  try {
    console.log("开始添加用药计划，患者ID:", patient_id);

    // 创建用药计划
    const planResult = await db.collection("medication_plan").add({
      patient_id: patient_id,
      medication_name: medication_name,
      start_date: start_date,
      end_date: end_date,
      time_slots: time_slots,
      status: "active",
      created_by: userInfo.userId,
      create_date: new Date().getTime(),
      update_date: new Date().getTime(),
    });

    const planId = planResult.id;
    console.log("用药计划创建成功，计划ID:", planId);

    // 新策略：创建计划时只补“今天”的 reminders/details（未来日期由定时任务生成）
    const reminders = [];
    const reminderDetails = [];

    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTs = todayStart.getTime();
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const todayEndTs = todayEnd.getTime();

    if (start_date <= todayEndTs && end_date >= todayStartTs) {
      // 今天在计划日期范围内
      for (const timeSlot of time_slots) {
        const [hours, minutes] = timeSlot.time.split(":").map(Number);
        const medicationTime = new Date(todayStartTs);
        medicationTime.setHours(hours, minutes, 0, 0);
        const medicationTimeTs = medicationTime.getTime();

        // reminder：存在则复用，不存在则创建
        const existingReminder = await db
          .collection("medication_reminders")
          .where({
            user_id: patient_id,
            medication_time: medicationTimeTs,
          })
          .get();

        let reminderId;
        if (existingReminder.data.length > 0) {
          reminderId = existingReminder.data[0]._id;
        } else {
          const reminderResult = await db.collection("medication_reminders").add({
            user_id: patient_id,
            medication_time: medicationTimeTs,
            status: "pending",
            reminder_sent: false,
            create_date: new Date().getTime(),
            update_date: new Date().getTime(),
          });
          reminderId = reminderResult.id;
          reminders.push(reminderId);
        }

        // detail：做增量去重，避免重复写入
        const dosageUnit = timeSlot.dosage_unit || "片";
        const existDetail = await db
          .collection("medication_reminder_details")
          .where({
            reminder_id: reminderId,
            medication_plan_id: planId,
            medication_name: medication_name,
            dosage_amount: timeSlot.dosage_amount,
            dosage_unit: dosageUnit,
          })
          .count();

        if (existDetail.total === 0) {
          const detailResult = await db
            .collection("medication_reminder_details")
            .add({
              reminder_id: reminderId,
              medication_plan_id: planId,
              medication_name: medication_name,
              dosage_amount: timeSlot.dosage_amount,
              dosage_unit: dosageUnit,
              notes: timeSlot.notes || "",
              create_date: new Date().getTime(),
            });
          reminderDetails.push(detailResult.id);
        }
      }
    } else {
      console.log("今天不在计划日期范围内，不生成当天 reminders/details。");
    }

    console.log(
      "用药添加成功，当天新增",
      reminders.length,
      "个用药提醒，",
      reminderDetails.length,
      "个详情记录"
    );

    return {
      code: 0,
      message: "添加用药成功",
      data: {
        plan_id: planId,
        patient_id: patient_id,
        medication_name: medication_name,
        start_date: start_date,
        end_date: end_date,
        time_slots_count: time_slots.length,
        reminders_count: reminders.length,
        details_count: reminderDetails.length,
        created_by: userInfo.userId,
      },
    };
  } catch (error) {
    console.error("添加用药失败:", error);
    return {
      code: -1,
      message: "添加用药失败",
      error: error.message,
    };
  }
};
