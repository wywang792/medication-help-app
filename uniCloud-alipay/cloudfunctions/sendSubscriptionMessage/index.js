"use strict";

const db = uniCloud.database();
const { authenticate } = require("auth");

exports.main = async (event, context) => {
  const { reminder_id } = event;

  try {
    // 如果传入了reminder_id，则为医护人员点击的单个发送
    if (reminder_id) {
      // 验证token
      const authResult = await authenticate(event);
      if (!authResult.success) {
        return {
          code: authResult.code,
          message: authResult.message,
        };
      }

      const userInfo = authResult.userInfo;
      return await sendSingleReminder(userInfo, reminder_id);
    } else {
      // 否则为定时器批量发送
      return await sendBatchReminders();
    }
  } catch (error) {
    console.error("发送订阅消息失败:", error);
    return {
      code: -1,
      message: "发送订阅消息失败",
      error: error.message,
    };
  }
};

// 发送单个提醒
async function sendSingleReminder(userInfo, reminderId) {
  console.log("开始发送单个用药提醒，提醒ID:", reminderId);

  // 检查用户权限（只有医护人员可以发送提醒）
  if (userInfo.role !== "medical" && userInfo.role !== "admin") {
    return {
      code: 403,
      message: "权限不足，只有医护人员可以发送提醒",
    };
  }

  // 获取提醒详情
  const reminderResult = await db
    .collection("medication_reminders")
    .doc(reminderId)
    .get();

  if (!reminderResult.data || reminderResult.data.length === 0) {
    return {
      code: 404,
      message: "用药提醒不存在",
    };
  }

  const reminder = reminderResult.data[0];

  // 获取患者信息
  const patientResult = await db
    .collection("users")
    .doc(reminder.user_id)
    .get();

  if (!patientResult.data || patientResult.data.length === 0) {
    return {
      code: 404,
      message: "患者不存在",
    };
  }

  const patient = patientResult.data[0];

  // 检查患者订阅次数
  if (!patient.subscriptionCount || patient.subscriptionCount <= 0) {
    return {
      code: 400,
      message: "患者订阅次数不足，无法发送提醒",
    };
  }

  // 获取提醒详情
  const detailsResult = await db
    .collection("medication_reminder_details")
    .where({
      reminder_id: reminderId,
    })
    .get();

  if (detailsResult.data.length === 0) {
    return {
      code: 404,
      message: "用药提醒详情不存在",
    };
  }

  // 构建用药信息
  const medicationInfo = detailsResult.data
    .map(
      (detail) =>
        `${detail.notes}${detail.medication_name}x${detail.dosage_amount}${detail.dosage_unit}`
    )
    .join("、");

  // 格式化时间
  const medicationTime = new Date(reminder.medication_time);
  const formattedTime = medicationTime.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  // 发送订阅消息
  const sendResult = await sendWechatMessage(
    patient.openid,
    formattedTime,
    medicationInfo
  );

  if (sendResult.success) {
    // 减少患者订阅次数
    await db
      .collection("users")
      .doc(reminder.user_id)
      .update({
        subscriptionCount: patient.subscriptionCount - 1,
        update_date: new Date().getTime(),
      });

    // 标记提醒已发送，避免重复提醒
    await db.collection("medication_reminders").doc(reminderId).update({
      reminder_sent: true,
      reminder_sent_time: new Date().getTime(),
      update_date: new Date().getTime(),
    });

    console.log("单个提醒发送成功，患者ID:", reminder.user_id);

    return {
      code: 0,
      message: "提醒发送成功",
      data: {
        reminder_id: reminderId,
        patient_id: reminder.user_id,
        remaining_subscriptions: patient.subscriptionCount - 1,
      },
    };
  } else {
    return {
      code: -1,
      message: "微信消息发送失败",
      error: sendResult.error,
    };
  }
}

// 批量发送提醒
async function sendBatchReminders() {
  console.log("开始批量发送用药提醒");

  const now = new Date();
  const currentTime = now.getTime();

  // 查询当前时间到30分钟内的未确认用药提醒，且未发送过提醒的
  const fiveMinutesLater = currentTime + 30 * 60 * 1000;

  const remindersResult = await db
    .collection("medication_reminders")
    .where({
      status: "pending",
      medication_time: db.command
        .gte(currentTime)
        .and(db.command.lte(fiveMinutesLater)),
      // 添加提醒标识，只查询未发送过提醒的记录
      reminder_sent: db.command.neq(true),
    })
    .get();

  if (remindersResult.data.length === 0) {
    console.log("当前时间范围内没有需要发送的提醒");
    return {
      code: 0,
      message: "没有需要发送的提醒",
      data: {
        sent_count: 0,
      },
    };
  }

  let sentCount = 0;
  const errors = [];

  for (const reminder of remindersResult.data) {
    try {
      // 获取患者信息
      const patientResult = await db
        .collection("users")
        .doc(reminder.user_id)
        .get();

      if (!patientResult.data || patientResult.data.length === 0) {
        console.log("患者不存在，跳过提醒ID:", reminder._id);
        continue;
      }

      const patient = patientResult.data[0];

      // 检查患者订阅次数
      if (!patient.subscriptionCount || patient.subscriptionCount <= 0) {
        console.log("患者订阅次数不足，跳过提醒ID:", reminder._id);
        continue;
      }

      // 获取提醒详情
      const detailsResult = await db
        .collection("medication_reminder_details")
        .where({
          reminder_id: reminder._id,
        })
        .get();

      if (detailsResult.data.length === 0) {
        console.log("提醒详情不存在，跳过提醒ID:", reminder._id);
        continue;
      }

      // 构建用药信息
      const medicationInfo = detailsResult.data
        .map(
          (detail) =>
            `${detail.medication_name} ${detail.dosage_amount}${detail.dosage_unit}`
        )
        .join("、");

      // 格式化时间
      const medicationTime = new Date(reminder.medication_time);
      const formattedTime = medicationTime.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      // 发送订阅消息
      const sendResult = await sendWechatMessage(
        patient.openid,
        formattedTime,
        medicationInfo
      );

      if (sendResult.success) {
        // 减少患者订阅次数
        await db
          .collection("users")
          .doc(reminder.user_id)
          .update({
            subscriptionCount: patient.subscriptionCount - 1,
            update_date: new Date().getTime(),
          });

        // 标记提醒已发送，避免重复提醒
        await db.collection("medication_reminders").doc(reminder._id).update({
          reminder_sent: true,
          reminder_sent_time: new Date().getTime(),
          update_date: new Date().getTime(),
        });

        sentCount++;
        console.log("批量提醒发送成功，提醒ID:", reminder._id);
      } else {
        errors.push({
          reminder_id: reminder._id,
          error: sendResult.error,
        });
      }
    } catch (error) {
      console.error("发送提醒失败，提醒ID:", reminder._id, error);
      errors.push({
        reminder_id: reminder._id,
        error: error.message,
      });
    }
  }

  console.log("批量发送完成，成功发送:", sentCount, "个提醒");

  return {
    code: 0,
    message: `批量发送完成，成功发送${sentCount}个提醒`,
    data: {
      sent_count: sentCount,
      total_count: remindersResult.data.length,
      errors: errors,
    },
  };
}

// 发送微信订阅消息
async function sendWechatMessage(openid, date4, thing2) {
  try {
    // 检查openid是否存在
    if (!openid) {
      console.log("患者openid为空，跳过发送");
      return {
        success: false,
        error: "患者openid为空",
      };
    }

    // 如果是模拟的openid，暂时跳过发送
    if (openid.startsWith("mock_openid_")) {
      console.log("检测到模拟openid，跳过发送:", openid);
      return {
        success: true, // 模拟成功
      };
    }

    thing2 = thing2.length > 17 ? thing2.slice(0, 17) + "..." : thing2;

    console.log("准备发送微信订阅消息:", {
      openid,
      date4,
      thing2,
    });

    // 调用wechatUtils云函数发送订阅消息
    const result = await uniCloud.callFunction({
      name: "wechatUtils",
      data: {
        action: "sendSubscribeMessage",
        openid: openid,
        template_id:
          process.env.WECHAT_SUBSCRIBE_TEMPLATE_ID ||
          "your-subscribe-template-id",
        data: {
          date4: { value: date4 },
          thing2: { value: thing2 },
        },
        page: "pages/index/index",
        miniprogram_state: "formal",
        lang: "zh_CN",
      },
    });

    console.log("wechatUtils发送订阅消息结果:", result.result);

    if (result.result.code === 0) {
      console.log("微信订阅消息发送成功");
      return {
        success: true,
      };
    } else {
      console.error("微信订阅消息发送失败:", result.result);
      return {
        success: false,
        error: result.result.message || "发送失败",
      };
    }
  } catch (error) {
    console.error("发送微信订阅消息失败:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
