"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
  try {
    const { article_id } = event;

    if (!article_id) {
      return {
        code: -1,
        message: "文章ID不能为空",
        data: null,
      };
    }

    console.log("开始获取文章详情，ID:", article_id);

    // 查询文章详情
    const result = await db
      .collection("health_articles")
      .doc(article_id)
      .get();

    if (!result.data || result.data.length === 0) {
      return {
        code: -1,
        message: "文章不存在",
        data: null,
      };
    }

    console.log("获取文章详情成功");

    return {
      code: 0,
      message: "获取文章详情成功",
      data: {
        article: result.data[0],
      },
    };
  } catch (error) {
    console.error("获取文章详情失败:", error);
    return {
      code: -1,
      message: "获取文章详情失败",
      data: null,
    };
  }
}; 