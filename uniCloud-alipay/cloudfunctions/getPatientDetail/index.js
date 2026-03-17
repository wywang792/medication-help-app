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
  const { patient_id } = event;

  // 检查用户角色
  if (userInfo.role !== "medical" && userInfo.role !== "admin") {
    return {
      code: 403,
      message: "权限不足，只有医护人员可以访问患者详情",
    };
  }

  if (!patient_id) {
    return {
      code: -1,
      message: "患者ID不能为空",
    };
  }

  try {
    console.log(
      "开始获取患者详情，医护ID:",
      userInfo.userId,
      "患者ID:",
      patient_id
    );

    // 获取患者基本信息
    const patientResult = await db.collection("users").doc(patient_id).get();

    if (patientResult.data.length === 0) {
      return {
        code: -1,
        message: "患者不存在",
      };
    }

    const patient = patientResult.data[0];

    // 检查是否为患者角色
    if (patient.role !== "patient" && patient.role !== "admin") {
      return {
        code: -1,
        message: "该用户不是患者",
      };
    }

    // 获取今日日期范围
    const start = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    const end = new Date(new Date().setHours(23, 59, 59, 999)).getTime();

    // 获取今日用药提醒
    const remindersResult = await db
      .collection("medication_reminders")
      .where({
        user_id: patient_id,
        medication_time: db.command.gte(start).and(db.command.lte(end)),
      })
      .orderBy("medication_time", "asc")
      .get();

    // 获取提醒详情
    let processedReminders = [];
    if (remindersResult.data.length > 0) {
      const reminderIds = remindersResult.data.map((reminder) => reminder._id);
      const detailsResult = await db
        .collection("medication_reminder_details")
        .where({
          reminder_id: db.command.in(reminderIds),
        })
        .get();

      // 按提醒ID分组详情记录
      const detailsMap = {};
      detailsResult.data.forEach((detail) => {
        if (!detailsMap[detail.reminder_id]) {
          detailsMap[detail.reminder_id] = [];
        }
        detailsMap[detail.reminder_id].push(detail);
      });

      // 处理提醒数据
      processedReminders = remindersResult.data.map((reminder) => ({
        _id: reminder._id,
        medication_time: reminder.medication_time,
        status: reminder.status,
        confirmed_time: reminder.confirmed_time,
        formattedTime: new Date(reminder.medication_time).toLocaleTimeString(
          "zh-CN",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        ),
        medications: detailsMap[reminder._id] || [],
      }));
    }

    // 获取用药历史（最近30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const historyStart = thirtyDaysAgo.getTime();

    const historyResult = await db
      .collection("medication_logs")
      .where({
        user_id: patient_id,
        medication_time: db.command
          .gte(historyStart)
          .and(db.command.lte(new Date().getTime())),
      })
      .orderBy("medication_time", "desc")
      .limit(100) // 限制返回最近100条记录
      .get();

    // 处理用药历史数据，按日期和时间分组
    const processedHistory = groupHistoryByDateAndTime(historyResult.data);

    // 获取患者的用药计划
    const plansResult = await db
      .collection("medication_plan")
      .where({
        patient_id: patient_id,
        status: db.command.in(["active", "inactive"]),
      })
      .orderBy("create_date", "desc")
      .get();

    // 处理用药计划数据，添加格式化日期
    const processedPlans = plansResult.data.map((plan) => ({
      ...plan,
      start_date_formatted: new Date(plan.start_date).toLocaleDateString(
        "zh-CN",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      ),
      end_date_formatted: new Date(plan.end_date).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    }));

    console.log("患者详情获取完成");

    return {
      code: 0,
      message: "获取患者详情成功",
      data: {
        patient: patient,
        medications: processedReminders,
        history: processedHistory,
        plans: processedPlans,
      },
    };
  } catch (error) {
    console.error("获取患者详情失败:", error);
    return {
      code: -1,
      message: "获取患者详情失败",
      error: error.message,
    };
  }
};

// 按日期和时间汇总历史数据
function groupHistoryByDateAndTime(logs) {
  const dateTimeGroups = {};

  logs.forEach((log) => {
    const medicationTime = new Date(log.medication_time);
    const dateKey = medicationTime.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const timeKey = medicationTime.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateTimeKey = `${dateKey}_${timeKey}`;

    if (!dateTimeGroups[dateTimeKey]) {
      dateTimeGroups[dateTimeKey] = {
        _id: `history_${dateTimeKey.replace(/[:\s]/g, "_")}`,
        medication_time: log.medication_time,
        confirmed_time: log.confirmed_time,
        formattedDate: dateKey,
        formattedTime: timeKey,
        status: "taken", // 历史记录都是已确认的
        medications: [],
        totalCount: 0,
        takenCount: 0,
        missedCount: 0,
      };
    }

    // 添加该时间点的所有药品信息
    log.medications.forEach((medication) => {
      dateTimeGroups[dateTimeKey].medications.push({
        _id: `${log._id}_${medication.medication_plan_id}`, // 生成唯一ID
        medication_name: medication.medication_name,
        dosage_amount: medication.dosage_amount,
        dosage_unit: medication.dosage_unit,
        status: "taken",
        notes: medication.notes || "",
      });
    });

    // 更新统计信息 - 每个时间段只计算一次
    if (dateTimeGroups[dateTimeKey].totalCount === 0) {
      dateTimeGroups[dateTimeKey].totalCount = 1;
      dateTimeGroups[dateTimeKey].takenCount = 1;
    }
  });

  // 转换为数组并按时间倒序排序（最新的在前）
  return Object.values(dateTimeGroups).sort((a, b) => {
    return new Date(b.medication_time) - new Date(a.medication_time);
  });
}
