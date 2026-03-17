"use strict";

const db = uniCloud.database();
const { authenticate } = require("auth");
const crypto = require("crypto");

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
  const { phone, name, hospitalNumber } = event;

  // 检查用户角色
  if (userInfo.role !== "medical" && userInfo.role !== "admin") {
    return {
      code: 403,
      message: "权限不足，只有医护人员可以添加患者",
    };
  }

  // 验证必填参数
  if (!phone || !name) {
    return {
      code: -1,
      message: "必填参数不完整",
    };
  }

  // 验证手机号格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return {
      code: -1,
      message: "账号格式不正确",
    };
  }

  // 验证昵称
  if (name.trim().length === 0 || name.trim().length > 20) {
    return {
      code: -1,
      message: "昵称长度不正确",
    };
  }

  try {
    console.log("开始添加患者，医护ID:", userInfo.userId);

    const now = Date.now();

    // 检查手机号是否已存在
    const existingUser = await db
      .collection("users")
      .where({
        phone: phone,
      })
      .get();

    if (existingUser.data.length > 0) {
      return {
        code: -1,
        message: "该手机号已被注册",
      };
    }

    // 创建患者用户
    const patientData = {
      phone: phone,
      name: name.trim(),
      role: "patient",
      status: "active",
      password: hashPassword("123456"), // 设置默认密码
      createTime: now,
      updateTime: now,
    };

    // 如果提供了住院号，也添加
    if (hospitalNumber && hospitalNumber.trim()) {
      patientData.hospitalNumber = hospitalNumber.trim();
    }

    const result = await db.collection("users").add(patientData);

    console.log("患者添加成功，患者ID:", result.id);

    return {
      code: 0,
      message: "添加患者成功",
      data: {
        patient_id: result.id,
        ...patientData,
      },
    };
  } catch (error) {
    console.error("添加患者失败:", error);
    return {
      code: -1,
      message: "添加患者失败，请重试",
      error: error.message,
    };
  }
};

/**
 * 密码加密
 * @param {string} password 原始密码
 * @returns {string} 加密后的密码
 */
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}
