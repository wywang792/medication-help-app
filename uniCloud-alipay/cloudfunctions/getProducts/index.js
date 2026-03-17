"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
  const { category_id } = event;

  try {
    console.log("开始获取商品列表");

    let query = {
      status: "active",
    };

    // 如果指定了分类，添加分类筛选
    if (category_id) {
      query.category_id = category_id;
    }

    // 获取商品列表
    const productsResult = await db
      .collection("products")
      .where(query)
      .orderBy("sort_order", "asc")
      .orderBy("create_date", "desc")
      .get();

    console.log("商品列表获取成功，数量:", productsResult.data.length);

    return {
      code: 0,
      message: "获取商品列表成功",
      data: {
        products: productsResult.data,
      },
    };
  } catch (error) {
    console.error("获取商品列表失败:", error);
    return {
      code: -1,
      message: "获取商品列表失败",
      error: error.message,
    };
  }
};
