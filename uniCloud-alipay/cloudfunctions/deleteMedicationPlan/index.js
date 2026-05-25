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
  const { plan_id } = event;

  // 检查用户角色
  if (userInfo.role !== "medical" && userInfo.role !== "admin") {
    return {
      code: 403,
      message: "权限不足，只有医护人员可以删除用药计划",
    };
  }

  // 参数验证
  if (!plan_id) {
    return {
      code: -1,
      message: "用药计划ID不能为空",
    };
  }

  try {
    console.log("开始删除用药计划，计划ID:", plan_id);

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

    // 新策略：删除计划时仅级联删除“今天”已生成的详情/提醒，避免当天出现多余提醒
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTs = todayStart.getTime();
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const todayEndTs = todayEnd.getTime();

    let deleteDetailsCount = 0;
    let deletedRemindersCount = 0;

    // 找出“今天该患者”的 reminders（这些 reminders 可能包含多个计划的详情）
    const todaysRemindersRes = await db
      .collection("medication_reminders")
      .where({
        user_id: plan.patient_id,
        medication_time: db.command.gte(todayStartTs).and(db.command.lte(todayEndTs)),
      })
      .get();
    const todaysReminders = todaysRemindersRes.data || [];
    const todaysReminderIds = todaysReminders.map((r) => r._id);

    // 删除“今天”该计划对应的详情
    if (todaysReminderIds.length > 0) {
      const delRes = await db
        .collection("medication_reminder_details")
        .where({
          medication_plan_id: plan_id,
          reminder_id: db.command.in(todaysReminderIds),
        })
        .remove();
      deleteDetailsCount = delRes.deleted || 0;
    }

    console.log("删除今日该计划提醒详情数量:", deleteDetailsCount);

    // 对每个今日 reminder_id：若已无任何详情，则删除 reminder（安全：避免误删同时间点其他计划）
    if (deleteDetailsCount > 0 && todaysReminderIds.length > 0) {
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

    // 删除用药计划
    await db.collection("medication_plan").doc(plan_id).remove();

    console.log("用药计划删除成功");

    return {
      code: 0,
      message: "用药计划删除成功",
      data: {
        plan_id: plan_id,
        deleted_details_count: deleteDetailsCount,
        deleted_reminders_count: deletedRemindersCount,
        deleted_by: userInfo.userId,
      },
    };
  } catch (error) {
    console.error("删除用药计划失败:", error);
    return {
      code: -1,
      message: "删除用药计划失败",
      error: error.message,
    };
  }
};
