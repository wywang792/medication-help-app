"use strict";

const db = uniCloud.database();
const crypto = require("crypto");

exports.main = async (event, context) => {
  const { phone, code, newPassword } = event;

  // 验证参数
  if (!phone || !code || !newPassword) {
    return {
      code: 1,
      message: "参数不完整",
    };
  }

  // 验证手机号格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return {
      code: 1,
      message: "手机号格式不正确",
    };
  }

  // 验证验证码格式
  if (!/^\d{6}$/.test(code)) {
    return {
      code: 1,
      message: "验证码格式不正确",
    };
  }

  // 验证密码格式
  if (newPassword.length < 6) {
    return {
      code: 1,
      message: "密码长度不能少于6位",
    };
  }

  try {
    const now = Date.now();

    // 查找有效的验证码
    const smsResult = await db
      .collection("sms_codes")
      .where({
        phone: phone,
        code: code,
        expireTime: db.command.gt(now),
        used: false,
      })
      .get();

    if (smsResult.data.length === 0) {
      return {
        code: 1,
        message: "验证码无效或已过期",
      };
    }

    // 标记验证码为已使用
    await db.collection("sms_codes").doc(smsResult.data[0]._id).update({
      used: true,
    });

    // 查找用户是否存在
    const userResult = await db
      .collection("users")
      .where({
        phone: phone,
      })
      .get();

    if (userResult.data.length === 0) {
      return {
        code: 1,
        message: "用户不存在",
      };
    }

    const user = userResult.data[0];

    // 更新用户密码
    await db
      .collection("users")
      .doc(user._id)
      .update({
        password: hashPassword(newPassword),
        updateTime: now,
      });

    return {
      code: 0,
      message: "密码重置成功",
    };
  } catch (error) {
    console.error("密码重置失败:", error);
    return {
      code: 1,
      message: "密码重置失败，请重试",
    };
  }
};

// 密码加密
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}
