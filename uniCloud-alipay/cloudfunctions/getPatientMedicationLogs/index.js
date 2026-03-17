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
    console.log("开始获取患者用药记录，患者ID:", userInfo.userId);

    // 获取患者的用药记录
    const logsResult = await db
      .collection("medication_logs")
      .where({
        user_id: userInfo.userId,
      })
      .orderBy("medication_time", "desc")
      .get();

    // 处理记录数据，展开每个时间点的多个用药
    const allLogs = [];
    logsResult.data.forEach((log) => {
      log.formatted_date = new Date(log.medication_time).toLocaleDateString(
        "zh-CN",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      );
      log.formatted_time = new Date(log.medication_time).toLocaleTimeString(
        "zh-CN",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    });

    // 手动分页
    const totalCount = logsResult.data.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const logs = logsResult.data.slice(startIndex, endIndex);

    console.log("患者用药记录获取完成，共", logs.length, "条记录");

    return {
      code: 0,
      message: "获取用药记录成功",
      data: {
        logs: logs,
        total_count: totalCount,
        current_page: page,
        page_size: pageSize,
        total_pages: Math.ceil(totalCount / pageSize),
      },
    };
  } catch (error) {
    console.error("获取患者用药记录失败:", error);
    return {
      code: -1,
      message: "获取用药记录失败",
      error: error.message,
    };
  }
};
