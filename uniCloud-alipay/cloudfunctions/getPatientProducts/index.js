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
      message: "权限不足，只有医护人员可以查看患者商品记录",
    };
  }

  if (!patient_id) {
    return {
      code: -1,
      message: "患者ID不能为空",
    };
  }

  try {
    console.log("开始获取患者商品记录，患者ID:", patient_id);

    // 获取患者商品记录
    const productsResult = await db
      .collection("user_products")
      .where({
        user_id: patient_id,
      })
      .orderBy("exchange_time", "desc")
      .get();

    console.log("患者商品记录获取成功，数量:", productsResult.data.length);

    return {
      code: 0,
      message: "获取患者商品记录成功",
      data: {
        products: productsResult.data,
      },
    };
  } catch (error) {
    console.error("获取患者商品记录失败:", error);
    return {
      code: -1,
      message: "获取患者商品记录失败",
      error: error.message,
    };
  }
};
