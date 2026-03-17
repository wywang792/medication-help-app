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
  const { page = 1, pageSize = 20 } = event;

  try {
    console.log("开始获取患者积分记录，患者ID:", userInfo.userId);

    // 计算分页参数
    const skip = (page - 1) * pageSize;

    // 获取患者的积分记录
    const logsResult = await db
      .collection("user_points_log")
      .where({
        user_id: userInfo.userId,
      })
      .orderBy("create_date", "desc")
      .skip(skip)
      .limit(pageSize)
      .get();

    // 获取总记录数
    const totalResult = await db
      .collection("user_points_log")
      .where({
        user_id: userInfo.userId,
      })
      .count();

    // 处理记录数据
    const logs = logsResult.data.map((log) => ({
      _id: log._id,
      points_change: log.points_change,
      change_type: log.change_type, // earn: 获得, spend: 消费
      description: log.description,
      related_type: log.related_type,
      balance_before: log.balance_before,
      balance_after: log.balance_after,
      create_date: log.create_date,
      formatted_date: new Date(log.create_date).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      formatted_time: new Date(log.create_date).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    console.log("患者积分记录获取完成，共", logs.length, "条记录");

    return {
      code: 0,
      message: "获取积分记录成功",
      data: {
        logs: logs,
        total_count: totalResult.total,
        current_page: page,
        page_size: pageSize,
        total_pages: Math.ceil(totalResult.total / pageSize),
      },
    };
  } catch (error) {
    console.error("获取患者积分记录失败:", error);
    return {
      code: -1,
      message: "获取积分记录失败",
      error: error.message,
    };
  }
};
