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

    // 更新用药计划的时间槽
    await db.collection("medication_plan").doc(plan_id).update({
      time_slots: time_slots,
      update_date: new Date().getTime(),
    });

    // 新策略：更新计划后仅处理“今天”的详情（未来由定时任务生成）
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTs = todayStart.getTime();
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const todayEndTs = todayEnd.getTime();

    let deletedDetailsCount = 0;
    let deletedRemindersCount = 0;
    let newDetailsCount = 0;

    if (plan.start_date <= todayEndTs && plan.end_date >= todayStartTs) {
      // 1) 找出今天受该计划影响的 reminder_id（按患者+时间范围）
      const todaysRemindersRes = await db
        .collection("medication_reminders")
        .where({
          user_id: plan.patient_id,
          medication_time: db.command.gte(todayStartTs).and(db.command.lte(todayEndTs)),
        })
        .get();
      const todaysReminders = todaysRemindersRes.data || [];
      const todaysReminderIds = todaysReminders.map((r) => r._id);

      // 2) 删除“今天”该计划对应的详情（避免旧时间槽残留）
      if (todaysReminderIds.length > 0) {
        const delRes = await db
          .collection("medication_reminder_details")
          .where({
            medication_plan_id: plan_id,
            reminder_id: db.command.in(todaysReminderIds),
          })
          .remove();
        deletedDetailsCount = delRes.deleted || 0;
      }

      // 3) 对每个今日时间槽补齐提醒/详情（增量）
      const createdReminderIds = [];
      for (const timeSlot of time_slots) {
        const [hours, minutes] = timeSlot.time.split(":").map(Number);
        const medicationTime = new Date(todayStartTs);
        medicationTime.setHours(hours, minutes, 0, 0);
        const medicationTimeTs = medicationTime.getTime();

        const existingReminder = await db
          .collection("medication_reminders")
          .where({
            user_id: plan.patient_id,
            medication_time: medicationTimeTs,
          })
          .get();

        let reminderId;
        if (existingReminder.data.length > 0) {
          reminderId = existingReminder.data[0]._id;
        } else {
          const reminderResult = await db.collection("medication_reminders").add({
            user_id: plan.patient_id,
            medication_time: medicationTimeTs,
            status: "pending",
            reminder_sent: false,
            create_date: new Date().getTime(),
            update_date: new Date().getTime(),
          });
          reminderId = reminderResult.id;
          createdReminderIds.push(reminderId);
        }

        const dosageUnit = timeSlot.dosage_unit || "片";
        const existDetail = await db
          .collection("medication_reminder_details")
          .where({
            reminder_id: reminderId,
            medication_plan_id: plan_id,
            medication_name: plan.medication_name,
            dosage_amount: timeSlot.dosage_amount,
            dosage_unit: dosageUnit,
          })
          .count();

        if (existDetail.total === 0) {
          await db.collection("medication_reminder_details").add({
            reminder_id: reminderId,
            medication_plan_id: plan_id,
            medication_name: plan.medication_name,
            dosage_amount: timeSlot.dosage_amount,
            dosage_unit: dosageUnit,
            notes: timeSlot.notes || "",
            create_date: new Date().getTime(),
          });
          newDetailsCount += 1;
        }
      }

      // 4) 删除今天“因为本计划删除详情后变空”的 reminders（安全：只删仍无任何详情的）
      if (todaysReminderIds.length > 0 && deletedDetailsCount > 0) {
        for (const reminderId of todaysReminderIds) {
          const remaining = await db
            .collection("medication_reminder_details")
            .where({ reminder_id: reminderId })
            .count();
          if (remaining.total === 0) {
            await db.collection("medication_reminders").doc(reminderId).remove();
            deletedRemindersCount += 1;
          }
        }
      }

      console.log("今日处理完成，删除详情:", deletedDetailsCount, "删除空提醒:", deletedRemindersCount, "新增详情:", newDetailsCount);
    } else {
      console.log("今天不在计划日期范围内，仅更新 time_slots，不处理当天 reminders/details。");
    }

    console.log("用药计划修改成功");

    return {
      code: 0,
      message: "用药计划修改成功",
      data: {
        plan_id: plan_id,
        time_slots_count: time_slots.length,
        // 新策略下仅统计“今天”的变更
        deleted_details_count: deletedDetailsCount,
        deleted_reminders_count: deletedRemindersCount,
        new_details_count: newDetailsCount,
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
