"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
  try {
    const { article_id, status } = event;

    if (!article_id) {
      return {
        code: -1,
        message: "文章ID不能为空",
        data: null,
      };
    }

    if (!status || !["published", "draft"].includes(status)) {
      return {
        code: -1,
        message: "状态值无效",
        data: null,
      };
    }

    console.log("开始更新文章状态，ID:", article_id, "状态:", status);

    const now = new Date();

    // 更新当前文章状态
    const result = await db
      .collection("health_articles")
      .doc(article_id)
      .update({
        status: status,
        update_date: now,
      });

    console.log("文章状态更新成功");

    return {
      code: 0,
      message: "文章状态更新成功",
      data: {
        updated: result.updated,
      },
    };
  } catch (error) {
    console.error("更新文章状态失败:", error);
    return {
      code: -1,
      message: "更新文章状态失败",
      data: null,
    };
  }
}; 