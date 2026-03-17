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
  const { patient_id, name, hospitalNumber } = event;

  // 检查用户角色
  if (userInfo.role !== "medical" && userInfo.role !== "admin") {
    return {
      code: 403,
      message: "权限不足，只有医护人员可以更新患者信息",
    };
  }

  if (!patient_id) {
    return {
      code: -1,
      message: "患者ID不能为空",
    };
  }

  // 验证必填参数
  if (!name) {
    return {
      code: -1,
      message: "必填参数不完整",
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
    console.log(
      "开始更新患者信息，医护ID:",
      userInfo.userId,
      "患者ID:",
      patient_id
    );

    // 检查患者是否存在
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

    // 准备更新数据
    const updateData = {
      name: name.trim(),
      updateTime: Date.now(),
    };

    // 如果提供了住院号，也更新
    if (hospitalNumber !== undefined) {
      updateData.hospitalNumber = hospitalNumber ? hospitalNumber.trim() : null;
    }

    // 更新患者信息
    const result = await db
      .collection("users")
      .doc(patient_id)
      .update(updateData);

    if (result.updated === 1) {
      console.log("患者信息更新成功");
      return {
        code: 0,
        message: "更新患者信息成功",
        data: {
          patient_id: patient_id,
          ...updateData,
        },
      };
    } else {
      return {
        code: -1,
        message: "更新患者信息失败",
      };
    }
  } catch (error) {
    console.error("更新患者信息失败:", error);
    return {
      code: -1,
      message: "更新患者信息失败，请重试",
      error: error.message,
    };
  }
};
