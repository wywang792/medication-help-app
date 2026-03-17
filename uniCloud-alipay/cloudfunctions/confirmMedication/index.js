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
  const { reminder_id } = event;

  // 参数验证
  if (!reminder_id) {
    return {
      code: -1,
      message: "用药提醒ID不能为空",
    };
  }

  try {
    console.log(
      "开始确认用药，患者ID:",
      userInfo.userId,
      "提醒ID:",
      reminder_id
    );

    // 获取用药提醒记录
    const reminderResult = await db
      .collection("medication_reminders")
      .where({
        _id: reminder_id,
        user_id: userInfo.userId,
        status: "pending",
      })
      .get();

    if (reminderResult.data.length === 0) {
      return {
        code: -1,
        message: "用药提醒不存在或已确认",
      };
    }

    const reminder = reminderResult.data[0];

    // 获取该提醒的所有详情记录
    const detailsResult = await db
      .collection("medication_reminder_details")
      .where({
        reminder_id: reminder_id,
      })
      .get();

    if (detailsResult.data.length === 0) {
      return {
        code: -1,
        message: "用药提醒详情不存在",
      };
    }

    // 更新提醒状态为已确认
    await db.collection("medication_reminders").doc(reminder_id).update({
      status: "taken",
      confirmed_time: new Date().getTime(),
      reminder_sent: true, // 确认用药时也标记为已发送，避免重复提醒
      update_date: new Date().getTime(),
    });

    // 创建用药日志记录
    const totalPoints = 10;

    await db.collection("medication_logs").add({
      user_id: userInfo.userId,
      medication_time: reminder.medication_time,
      confirmed_time: new Date().getTime(),
      medications: detailsResult.data.map((detail) => ({
        medication_plan_id: detail.medication_plan_id,
        medication_reminder_id: detail.reminder_id,
        medication_name: detail.medication_name,
        dosage_amount: detail.dosage_amount,
        dosage_unit: detail.dosage_unit,
        notes: detail.notes || "",
      })),
      points_earned: totalPoints,
      create_date: new Date().getTime(),
    });

    // 确认用药成功后，给用户增加积分
    try {
      // 查询用户当前积分
      const pointsResult = await db
        .collection("user_points")
        .where({
          user_id: userInfo.userId,
        })
        .get();

      let currentPoints = 0;
      let pointsRecordId = null;

      if (pointsResult.data.length > 0) {
        currentPoints = pointsResult.data[0].total_points;
        pointsRecordId = pointsResult.data[0]._id;
      } else {
        // 如果用户没有积分记录，创建一个初始记录
        const newRecord = await db.collection("user_points").add({
          user_id: userInfo.userId,
          total_points: 0,
          create_date: new Date().getTime(),
          update_date: new Date().getTime(),
        });
        pointsRecordId = newRecord.id;
      }

      const newTotalPoints = currentPoints + totalPoints;

      // 更新用户积分
      await db.collection("user_points").doc(pointsRecordId).update({
        total_points: newTotalPoints,
        update_date: new Date().getTime(),
      });

      // 记录积分日志
      await db.collection("user_points_log").add({
        user_id: userInfo.userId,
        points_change: totalPoints,
        change_type: "earn",
        description: `确认用药获得积分`,
        related_id: reminder_id,
        related_type: "medication_reminder",
        balance_before: currentPoints,
        balance_after: newTotalPoints,
        create_date: new Date().getTime(),
      });

      console.log(
        "用户积分增加成功，获得积分:",
        totalPoints,
        "新积分:",
        newTotalPoints
      );
    } catch (pointsError) {
      console.error("增加用户积分失败:", pointsError);
      // 积分增加失败不影响用药确认的成功
    }

    console.log("确认用药成功");

    return {
      code: 0,
      message: `确认用药成功，共确认${detailsResult.data.length}个用药`,
      data: {
        reminder_id: reminder_id,
        confirmed_count: detailsResult.data.length,
        points_earned: totalPoints,
        confirmed_time: new Date().getTime(),
      },
    };
  } catch (error) {
    console.error("确认用药失败:", error);
    return {
      code: -1,
      message: "确认用药失败",
      error: error.message,
    };
  }
};
