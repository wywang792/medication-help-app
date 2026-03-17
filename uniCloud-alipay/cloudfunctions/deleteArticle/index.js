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

    console.log("开始删除文章，ID:", article_id);

    const result = await db
      .collection("health_articles")
      .doc(article_id)
      .remove();

    console.log("文章删除成功");

    return {
      code: 0,
      message: "文章删除成功",
      data: {
        deleted: result.deleted,
      },
    };
  } catch (error) {
    console.error("删除文章失败:", error);
    return {
      code: -1,
      message: "删除文章失败",
      data: null,
    };
  }
}; 