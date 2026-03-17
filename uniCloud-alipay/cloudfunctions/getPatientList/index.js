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
      message: "权限不足，只有医护人员可以访问患者列表",
    };
  }

  try {
    console.log("开始获取患者列表，医护ID:", userInfo.userId);

    // 获取今日日期范围
    const start = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    const end = new Date(new Date().setHours(23, 59, 59, 999)).getTime();

    // 获取所有患者
    const patientsResult = await db
      .collection("users")
      .where({
        role: db.command.in(["patient", "admin"]),
        status: db.command.in(["active", "inactive"]),
      })
      .orderBy("createTime", "desc")
      .get();

    console.log("查询到患者数量:", patientsResult.data.length);

    // 如果没有患者，直接返回
    if (patientsResult.data.length === 0) {
      return {
        code: 0,
        message: "获取患者列表成功",
        data: {
          patients: [],
        },
      };
    }

    // 批量获取所有患者今日的用药提醒数量（优化：避免N+1查询）
    const patientIds = patientsResult.data.map((patient) => patient._id);

		const startTime = new Date().getTime()
    // 一次性查询所有患者今日的用药提醒
    const remindersResult = await db
      .collection("medication_reminders")
      .where({
        user_id: db.command.in(patientIds),
        medication_time: db.command.gte(start).and(db.command.lte(end)),
      })
      .get();
			
		console.log(`查询到用药提醒数量: ${remindersResult.data.length},耗时${(new Date().getTime() - startTime) / 1000}`, );

    // 按用户ID分组统计数量
    const medicationCountMap = {};
    remindersResult.data.forEach((reminder) => {
      if (!medicationCountMap[reminder.user_id]) {
        medicationCountMap[reminder.user_id] = 0;
      }
      medicationCountMap[reminder.user_id]++;
    });

    // 合并数据到患者列表
    const patientsWithMedications = patientsResult.data.map((patient) => ({
      ...patient,
      todayMedications: medicationCountMap[patient._id] || 0,
    }));

    console.log("患者列表处理完成");

    return {
      code: 0,
      message: "获取患者列表成功",
      data: {
        patients: patientsWithMedications,
      },
    };
  } catch (error) {
    console.error("获取患者列表失败:", error);
    return {
      code: -1,
      message: "获取患者列表失败",
      error: error.message,
    };
  }
};
