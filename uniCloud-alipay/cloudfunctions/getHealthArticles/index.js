"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
  try {
    console.log("开始获取健康文章列表");

    // 查询文章列表，按排序顺序和创建时间排序
    const result = await db
      .collection("health_articles")
      .orderBy("sort_order", "asc")
      .orderBy("create_date", "desc")
      .get();

    console.log("获取文章列表成功，数量:", result.data.length);

    return {
      code: 0,
      message: "获取文章列表成功",
      data: {
        articles: result.data,
      },
    };
  } catch (error) {
    console.error("获取文章列表失败:", error);
    return {
      code: -1,
      message: "获取文章列表失败",
      data: null,
    };
  }
}; 