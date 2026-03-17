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

  // 检查用户角色
  if (userInfo.role !== "medical" && userInfo.role !== "admin") {
    return {
      code: 403,
      message: "权限不足，只有医护人员可以访问最近活动",
    };
  }

  try {
    console.log("开始获取最近活动，医护ID:", userInfo.userId);

    // 获取最近三天的日期范围
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const startTime = threeDaysAgo.getTime();

    // 获取最近三天的用药确认日志
    const logsResult = await db
      .collection("medication_logs")
      .where({
        confirmed_time: db.command.gte(startTime),
      })
      .orderBy("medication_time", "desc")
      .get();

    // 获取相关患者信息
    const patientIds = [...new Set(logsResult.data.map((log) => log.user_id))];
    const patientsResult = await db
      .collection("users")
      .where({
        _id: db.command.in(patientIds),
      })
      .get();

    // 创建患者信息映射
    const patientMap = {};
    patientsResult.data.forEach((patient) => {
      patientMap[patient._id] = patient;
    });

    // 处理活动数据，添加患者信息
    logsResult.data.forEach((log) => {
      const patient = patientMap[log.user_id];
      log.type = "medication_confirmed";
      log.patient_id = log.user_id;
      log.patient_name = patient ? patient.name : "未知患者";
      log.formatted_time = new Date(log.medication_time).toLocaleString(
        "zh-CN",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    });

    console.log("最近活动获取完成，共", logsResult.data.length, "条记录");

    return {
      code: 0,
      message: "获取最近活动成功",
      data: {
        activities: logsResult.data,
        total_count: logsResult.data.length,
      },
    };
  } catch (error) {
    console.error("获取最近活动失败:", error);
    return {
      code: -1,
      message: "获取最近活动失败",
      error: error.message,
    };
  }
};
