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

  try {
    console.log("开始获取用户积分，用户ID:", userInfo.userId);

    // 查询用户积分记录
    const pointsResult = await db
      .collection("user_points")
      .where({
        user_id: userInfo.userId,
      })
      .get();

    let totalPoints = 0;

    if (pointsResult.data.length > 0) {
      totalPoints = pointsResult.data[0].total_points;
    } else {
      // 如果用户没有积分记录，创建一个初始记录
      await db.collection("user_points").add({
        user_id: userInfo.userId,
        total_points: 0,
        create_date: new Date().getTime(),
        update_date: new Date().getTime(),
      });
    }

    console.log("用户积分获取成功，总积分:", totalPoints);

    return {
      code: 0,
      message: "获取用户积分成功",
      data: {
        total_points: totalPoints,
      },
    };
  } catch (error) {
    console.error("获取用户积分失败:", error);
    return {
      code: -1,
      message: "获取用户积分失败",
      error: error.message,
    };
  }
};
