"use strict";

const db = uniCloud.database();
const { generateToken } = require('auth');

exports.main = async (event, context) => {
  const { userId, name, hospitalNumber } = event;

  // 验证参数
  if (!userId || !name) {
    return {
      code: 1,
      message: "必填参数不完整",
    };
  }

  // 验证昵称
  if (name.trim().length === 0 || name.trim().length > 20) {
    return {
      code: 1,
      message: "昵称长度不正确",
    };
  }

  try {
    const now = Date.now();

    // 更新用户信息
    const updateData = {
      name: name.trim(),
      updateTime: now,
    };

    // 如果提供了住院号，也更新
    if (hospitalNumber && hospitalNumber.trim()) {
      updateData.hospitalNumber = hospitalNumber.trim();
    }

    await db.collection("users").doc(userId).update(updateData);

    // 获取更新后的用户信息
    const userResult = await db.collection("users").doc(userId).get();
    const userData = userResult.data[0];
    
    // 生成新的JWT token
    const token = generateToken(userData);

    return {
      code: 0,
      message: "注册成功",
      data: {
        ...userData,
        token: token
      },
    };
  } catch (error) {
    console.error("注册失败:", error);
    return {
      code: 1,
      message: "注册失败，请重试",
    };
  }
};
