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
  const { product_id } = event;

  if (!product_id) {
    return {
      code: -1,
      message: "商品ID不能为空",
    };
  }

  try {
    console.log(
      "开始兑换商品，用户ID:",
      userInfo.userId,
      "商品ID:",
      product_id
    );

    // 获取商品信息
    const productResult = await db.collection("products").doc(product_id).get();

    if (productResult.data.length === 0) {
      return {
        code: -1,
        message: "商品不存在",
      };
    }

    const product = productResult.data[0];

    if (product.status !== "active") {
      return {
        code: -1,
        message: "商品已下架",
      };
    }

    // 检查库存
    if (product.stock !== undefined && product.stock <= 0) {
      return {
        code: -1,
        message: "商品库存不足",
      };
    }

    // 获取用户积分
    const pointsResult = await db
      .collection("user_points")
      .where({
        user_id: userInfo.userId,
      })
      .get();

    let currentPoints = 0;
    let pointsRecordId = null;

    if (pointsResult.data.length > 0) {
      currentPoints = pointsResult.data[0].total_points;
      pointsRecordId = pointsResult.data[0]._id;
    } else {
      return {
        code: -1,
        message: "用户积分记录不存在",
      };
    }

    // 检查积分是否足够
    if (currentPoints < product.points_required) {
      return {
        code: -1,
        message: "积分不足",
      };
    }

    // 开始事务处理
    const transaction = await db.startTransaction();

    try {
      // 扣除用户积分
      const newTotalPoints = currentPoints - product.points_required;
      await transaction.collection("user_points").doc(pointsRecordId).update({
        total_points: newTotalPoints,
        update_date: new Date().getTime(),
      });

      // 记录积分消费日志
      await transaction.collection("user_points_log").add({
        user_id: userInfo.userId,
        points_change: -product.points_required,
        change_type: "spend",
        description: `兑换商品：${product.name}`,
        related_id: product_id,
        related_type: "product_exchange",
        balance_before: currentPoints,
        balance_after: newTotalPoints,
        create_date: new Date().getTime(),
      });

      // 创建用户商品记录
      const userProductRecord = await transaction
        .collection("user_products")
        .add({
          user_id: userInfo.userId,
          product_id: product_id,
          product_name: product.name,
          product_description: product.description,
          product_image: product.image,
          points_used: product.points_required,
          status: "processing",
          exchange_time: new Date().getTime(),
          create_date: new Date().getTime(),
          update_date: new Date().getTime(),
        });

      // 更新商品库存（如果有库存限制）
      if (product.stock !== undefined) {
        await transaction
          .collection("products")
          .doc(product_id)
          .update({
            stock: product.stock - 1,
            update_date: new Date().getTime(),
          });
      }

      // 提交事务
      await transaction.commit();

      console.log("商品兑换成功，用户商品ID:", userProductRecord.id);

      return {
        code: 0,
        message: "商品兑换成功",
        data: {
          user_product_id: userProductRecord.id,
          points_used: product.points_required,
          remaining_points: newTotalPoints,
        },
      };
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("商品兑换失败:", error);
    return {
      code: -1,
      message: "商品兑换失败",
      error: error.message,
    };
  }
};
