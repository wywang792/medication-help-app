"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
  const { phone } = event;

  // 验证手机号格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return {
      code: 1,
      message: "手机号格式不正确",
    };
  }

  try {
    // 生成6位随机验证码
    const code = Math.random().toString().slice(2, 8);

    // 检查是否在1分钟内已经发送过验证码
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    const existingCode = await db
      .collection("sms_codes")
      .where({
        phone: phone,
        createTime: db.command.gt(oneMinuteAgo),
      })
      .get();

    if (existingCode.data.length > 0) {
      return {
        code: 1,
        message: "验证码发送过于频繁，请稍后再试",
      };
    }

    // 保存验证码到数据库
    await db.collection("sms_codes").add({
      phone: phone,
      code: code,
      createTime: now,
      expireTime: now + 5 * 60 * 1000, // 5分钟过期
      used: false,
    });

    // 调用uniCloud短信服务发送验证码
    try {
      const smsResult = await uniCloud.sendSms({
        appid: process.env.UNI_APP_ID || "__UNI__YOUR_APPID",
        phone: phone,
        templateId: process.env.UNI_SMS_TEMPLATE_ID || "your-sms-template-id",
        data: {
          code: code,
					expMinute: 5
        },
      });

      console.log("短信发送结果:", smsResult);

      return {
        code: 0,
        message: "验证码发送成功",
      };
    } catch (smsError) {
      console.error("短信发送失败:", smsError);
      return {
        code: 1,
        message: "短信发送失败，请重试",
      };
    }
  } catch (error) {
    console.error("发送验证码失败:", error);
    return {
      code: 1,
      message: "发送验证码失败，请重试",
    };
  }
};
