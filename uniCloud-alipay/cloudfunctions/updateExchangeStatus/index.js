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
  const { user_product_id, status, notes } = event;

  // 检查用户角色
  if (userInfo.role !== "medical" && userInfo.role !== "admin") {
    return {
      code: 403,
      message: "权限不足，只有医护人员可以更新兑换状态",
    };
  }

  if (!user_product_id) {
    return {
      code: -1,
      message: "用户商品ID不能为空",
    };
  }

  if (!status || !["processing", "completed", "cancelled"].includes(status)) {
    return {
      code: -1,
      message: "状态值无效",
    };
  }

  try {
    console.log(
      "开始更新兑换状态，医护ID:",
      userInfo.userId,
      "用户商品ID:",
      user_product_id,
      "状态:",
      status
    );

    // 获取用户商品记录
    const userProductResult = await db
      .collection("user_products")
      .doc(user_product_id)
      .get();

    if (userProductResult.data.length === 0) {
      return {
        code: -1,
        message: "用户商品记录不存在",
      };
    }

    const userProduct = userProductResult.data[0];

    // 如果状态已经是目标状态，无需更新
    if (userProduct.status === status) {
      return {
        code: 0,
        message: "状态已经是目标状态",
        data: {
          user_product_id: user_product_id,
          status: status,
        },
      };
    }

    // 更新用户商品状态
    const updateData = {
      status: status,
      update_date: new Date().getTime(),
    };

    // 如果状态变为已完成，记录完成时间
    if (status === "completed") {
      updateData.complete_time = new Date();
    }

    // 如果有备注，添加备注
    if (notes) {
      updateData.notes = notes;
    }

    await db
      .collection("user_products")
      .doc(user_product_id)
      .update(updateData);

    console.log("兑换状态更新成功");

    return {
      code: 0,
      message: "兑换状态更新成功",
      data: {
        user_product_id: user_product_id,
        status: status,
        updated_by: userInfo.userId,
      },
    };
  } catch (error) {
    console.error("更新兑换状态失败:", error);
    return {
      code: -1,
      message: "更新兑换状态失败",
      error: error.message,
    };
  }
};
