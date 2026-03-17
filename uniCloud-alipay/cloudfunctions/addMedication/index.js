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

    // 生成用药提醒记录
    const reminders = [];
    const reminderDetails = [];
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const currentDate = new Date(startDate);

    // 遍历日期范围内的每一天
    while (currentDate <= endDate) {
      // 为每个时间槽创建用药提醒
      for (const timeSlot of time_slots) {
        // 解析时间
        const [hours, minutes] = timeSlot.time.split(":").map(Number);
        const medicationTime = new Date(
          currentDate.setHours(hours, minutes, 0, 0)
        ).getTime();

        // 检查该时间是否已有用药提醒
        const existingReminder = await db
          .collection("medication_reminders")
          .where({
            user_id: patient_id,
            medication_time: medicationTime,
          })
          .get();

        let reminderId;
        if (existingReminder.data.length > 0) {
          // 如果已存在提醒记录，使用现有的
          reminderId = existingReminder.data[0]._id;
        } else {
          // 创建新的提醒记录
          const reminderResult = await db
            .collection("medication_reminders")
            .add({
              user_id: patient_id,
              medication_time: medicationTime,
              status: "pending",
              reminder_sent: false, // 初始化提醒标识
              create_date: new Date().getTime(),
              update_date: new Date().getTime(),
            });
          reminderId = reminderResult.id;
          reminders.push(reminderId);
        }

        // 创建提醒详情记录
        const detailResult = await db
          .collection("medication_reminder_details")
          .add({
            reminder_id: reminderId,
            medication_plan_id: planId,
            medication_name: medication_name,
            dosage_amount: timeSlot.dosage_amount,
            dosage_unit: timeSlot.dosage_unit || "片",
            notes: timeSlot.notes || "",
            create_date: new Date().getTime(),
          });

        reminderDetails.push(detailResult.id);
      }

      // 移动到下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(
      "用药添加成功，共创建",
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
