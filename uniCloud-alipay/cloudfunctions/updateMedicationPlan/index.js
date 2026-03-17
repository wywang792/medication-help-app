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
  const { plan_id, time_slots } = event;

  // 检查用户角色
  if (userInfo.role !== "medical" && userInfo.role !== "admin") {
    return {
      code: 403,
      message: "权限不足，只有医护人员可以修改用药计划",
    };
  }

  // 参数验证
  if (!plan_id) {
    return {
      code: -1,
      message: "用药计划ID不能为空",
    };
  }

  if (!time_slots || !Array.isArray(time_slots) || time_slots.length === 0) {
    return {
      code: -1,
      message: "用药时间不能为空",
    };
  }

  try {
    console.log("开始修改用药计划，计划ID:", plan_id);

    // 获取用药计划
    const planResult = await db
      .collection("medication_plan")
      .doc(plan_id)
      .get();
    if (planResult.data.length === 0) {
      return {
        code: -1,
        message: "用药计划不存在",
      };
    }

    const plan = planResult.data[0];

    // 先获取该计划的所有提醒详情记录，获取相关的提醒ID
    const existingDetailsResult = await db
      .collection("medication_reminder_details")
      .where({
        medication_plan_id: plan_id,
      })
      .get();

    // 获取所有相关的提醒记录ID
    const affectedReminderIds = [
      ...new Set(
        existingDetailsResult.data.map((detail) => detail.reminder_id)
      ),
    ];

    // 删除该计划的所有提醒详情记录
    const deleteDetailsResult = await db
      .collection("medication_reminder_details")
      .where({
        medication_plan_id: plan_id,
      })
      .remove();

    console.log("删除提醒详情记录数量:", deleteDetailsResult.deleted);

    // 获取需要删除的提醒记录ID（如果删除详情后提醒记录没有其他详情了）
    const deletedReminderIds = [];
    if (deleteDetailsResult.deleted > 0 && affectedReminderIds.length > 0) {
      // 检查每个提醒记录是否还有其他详情
      for (const reminderId of affectedReminderIds) {
        const remainingDetails = await db
          .collection("medication_reminder_details")
          .where({
            reminder_id: reminderId,
          })
          .count();

        if (remainingDetails.total === 0) {
          deletedReminderIds.push(reminderId);
        }
      }

      // 删除空的提醒记录
      if (deletedReminderIds.length > 0) {
        await db
          .collection("medication_reminders")
          .where({
            _id: db.command.in(deletedReminderIds),
          })
          .remove();
        console.log("删除空的提醒记录数量:", deletedReminderIds.length);
      }
    }

    // 更新用药计划的时间槽
    await db.collection("medication_plan").doc(plan_id).update({
      time_slots: time_slots,
      update_date: new Date().getTime(),
    });

    // 重新生成用药提醒详情记录
    const newReminderDetails = [];
    const startDate = new Date(plan.start_date);
    const endDate = new Date(plan.end_date);
    const currentDate = new Date(startDate);

    // 遍历日期范围内的每一天
    while (currentDate <= endDate) {
      // 为每个时间槽创建用药提醒详情
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
            user_id: plan.patient_id,
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
              user_id: plan.patient_id,
              medication_time: medicationTime,
              status: "pending",
              reminder_sent: false, // 初始化提醒标识
              create_date: new Date().getTime(),
              update_date: new Date().getTime(),
            });
          reminderId = reminderResult.id;
        }

        // 创建提醒详情记录
        const detailResult = await db
          .collection("medication_reminder_details")
          .add({
            reminder_id: reminderId,
            medication_plan_id: plan_id,
            medication_name: plan.medication_name,
            dosage_amount: timeSlot.dosage_amount,
            dosage_unit: timeSlot.dosage_unit || "片",
            notes: timeSlot.notes || "",
            create_date: new Date().getTime(),
          });

        newReminderDetails.push(detailResult.id);
      }

      // 移动到下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log("重新生成的用药提醒详情数量:", newReminderDetails.length);

    console.log("用药计划修改成功");

    return {
      code: 0,
      message: "用药计划修改成功",
      data: {
        plan_id: plan_id,
        time_slots_count: time_slots.length,
        deleted_details_count: deleteDetailsResult.deleted,
        deleted_reminders_count: deletedReminderIds.length,
        new_details_count: newReminderDetails.length,
        updated_by: userInfo.userId,
      },
    };
  } catch (error) {
    console.error("修改用药计划失败:", error);
    return {
      code: -1,
      message: "修改用药计划失败",
      error: error.message,
    };
  }
};
