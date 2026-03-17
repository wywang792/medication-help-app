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
    console.log("开始获取用户兑换记录，用户ID:", userInfo.userId);

    // 获取用户兑换记录
    const historyResult = await db
      .collection("user_products")
      .where({
        user_id: userInfo.userId,
      })
      .orderBy("exchange_time", "desc")
      .get();

    console.log("兑换记录获取成功，数量:", historyResult.data.length);

    return {
      code: 0,
      message: "获取兑换记录成功",
      data: {
        history: historyResult.data,
      },
    };
  } catch (error) {
    console.error("获取兑换记录失败:", error);
    return {
      code: -1,
      message: "获取兑换记录失败",
      error: error.message,
    };
  }
};
