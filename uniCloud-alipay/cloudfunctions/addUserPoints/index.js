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
  const { points, description, related_id, related_type } = event;

  if (!points || points <= 0) {
    return {
      code: -1,
      message: "积分数量必须大于0",
    };
  }

  try {
    console.log("开始增加用户积分，用户ID:", userInfo.userId, "积分:", points);

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

    const newTotalPoints = currentPoints + points;

    // 更新用户积分
    await db.collection("user_points").doc(pointsRecordId).update({
      total_points: newTotalPoints,
      update_date: new Date().getTime(),
    });

    // 记录积分日志
    await db.collection("user_points_log").add({
      user_id: userInfo.userId,
      points_change: points,
      change_type: "earn",
      description: description || "确认用药获得积分",
      related_id: related_id || null,
      related_type: related_type || "medication_reminder",
      balance_before: currentPoints,
      balance_after: newTotalPoints,
      create_date: new Date().getTime(),
    });

    console.log("用户积分增加成功，新积分:", newTotalPoints);

    return {
      code: 0,
      message: "积分增加成功",
      data: {
        points_added: points,
        total_points: newTotalPoints,
      },
    };
  } catch (error) {
    console.error("增加用户积分失败:", error);
    return {
      code: -1,
      message: "增加用户积分失败",
      error: error.message,
    };
  }
};
