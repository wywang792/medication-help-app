"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
  try {
    const {
      article_id,
      title,
      description,
      cover_image,
      sort_order,
      status,
      paragraphs,
    } = event;

    if (!article_id) {
      return {
        code: -1,
        message: "文章ID不能为空",
        data: null,
      };
    }

    // 验证必填字段
    if (!title || !title.trim()) {
      return {
        code: -1,
        message: "文章标题不能为空",
        data: null,
      };
    }

    console.log("开始更新文章，ID:", article_id);

    const now = new Date();
    const updateData = {
      title: title.trim(),
      description: description ? description.trim() : "",
      cover_image: cover_image || "",
      sort_order: sort_order ? parseInt(sort_order) : 0,
      status: status || "disabled",
      paragraphs: paragraphs || [],
      update_date: now,
    };

    const result = await db
      .collection("health_articles")
      .doc(article_id)
      .update(updateData);

    console.log("文章更新成功");

    return {
      code: 0,
      message: "文章更新成功",
      data: {
        updated: result.updated,
      },
    };
  } catch (error) {
    console.error("更新文章失败:", error);
    return {
      code: -1,
      message: "更新文章失败",
      data: null,
    };
  }
}; 