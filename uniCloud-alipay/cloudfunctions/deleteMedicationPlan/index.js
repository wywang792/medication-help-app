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

    // 删除用药计划
    await db.collection("medication_plan").doc(plan_id).remove();

    console.log("用药计划删除成功");

    return {
      code: 0,
      message: "用药计划删除成功",
      data: {
        plan_id: plan_id,
        deleted_details_count: deleteDetailsResult.deleted,
        deleted_reminders_count: deletedReminderIds.length,
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
