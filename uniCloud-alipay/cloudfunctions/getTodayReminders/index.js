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
    console.log("开始获取今日用药提醒，用户ID:", userInfo.userId);

    // 获取今日日期范围
    const start = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    const end = new Date(new Date().setHours(23, 59, 59, 999)).getTime();

    // 获取今日的用药提醒记录
    const remindersResult = await db
      .collection("medication_reminders")
      .where({
        user_id: userInfo.userId,
        medication_time: db.command.gte(start).and(db.command.lte(end)),
      })
      .orderBy("medication_time", "asc")
      .get();

    if (remindersResult.data.length === 0) {
      return {
        code: 0,
        message: "获取用药提醒成功",
        data: {
          reminders: [],
        },
      };
    }

    // 获取所有提醒记录的详情
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

    // 处理提醒数据，添加详情信息
    const now = new Date();
    const processedReminders = remindersResult.data.map((reminder) => {
      const medicationTime = new Date(reminder.medication_time);
      const timeDiff = medicationTime - now;

      let timeStatus = "";
      let timeText = "";

      if (timeDiff > 0) {
        // 还未到用药时间
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        timeStatus = "upcoming";
        timeText = `还有 ${hours}小时${minutes}分钟`;
      } else if (timeDiff <= 0 && reminder.status === "pending") {
        // 已过用药时间但未确认
        const hours = Math.floor(Math.abs(timeDiff) / (1000 * 60 * 60));
        const minutes = Math.floor(
          (Math.abs(timeDiff) % (1000 * 60 * 60)) / (1000 * 60)
        );
        timeStatus = "overdue";
        timeText = `已超时 ${hours}小时${minutes}分钟`;
      } else {
        timeStatus = "completed";
        timeText = "已完成";
      }

      return {
        _id: reminder._id,
        medication_time: reminder.medication_time,
        status: reminder.status,
        confirmed_time: reminder.confirmed_time,
        timeStatus,
        timeText,
        formattedTime: medicationTime.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        medications: detailsMap[reminder._id] || [],
      };
    });

    console.log("用药提醒处理完成，共", processedReminders.length, "个提醒");

    return {
      code: 0,
      message: "获取用药提醒成功",
      data: {
        reminders: processedReminders,
      },
    };
  } catch (error) {
    console.error("获取今日提醒失败:", error);
    return {
      code: -1,
      message: "获取用药提醒失败",
      error: error.message,
    };
  }
};
