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
    console.log("开始增加用户订阅次数，用户ID:", userInfo.userId);

    // 获取用户当前信息
    const userResult = await db.collection("users").doc(userInfo.userId).get();

    if (!userResult.data || userResult.data.length === 0) {
      return {
        code: 404,
        message: "用户不存在",
      };
    }

    const currentUser = userResult.data[0];
    const currentSubscriptionCount = currentUser.subscriptionCount || 0;
    const newSubscriptionCount = currentSubscriptionCount + 1;

    // 更新用户的订阅次数
    const updateResult = await db
      .collection("users")
      .doc(userInfo.userId)
      .update({
        subscriptionCount: newSubscriptionCount,
        update_date: new Date().getTime(),
      });

    if (updateResult.updated === 1) {
      console.log("用户订阅次数增加成功，新次数:", newSubscriptionCount);

      return {
        code: 0,
        message: "订阅次数增加成功",
        data: {
          newCount: newSubscriptionCount,
          previousCount: currentSubscriptionCount,
        },
      };
    } else {
      return {
        code: -1,
        message: "更新订阅次数失败",
      };
    }
  } catch (error) {
    console.error("增加用户订阅次数失败:", error);
    return {
      code: -1,
      message: "增加订阅次数失败",
      error: error.message,
    };
  }
};
