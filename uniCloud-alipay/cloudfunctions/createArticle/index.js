"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
  try {
    const {
      title,
      description,
      cover_image,
      sort_order,
      status,
      paragraphs,
    } = event;

    // 验证必填字段
    if (!title || !title.trim()) {
      return {
        code: -1,
        message: "文章标题不能为空",
        data: null,
      };
    }

    console.log("开始创建文章:", { title, description });

    const now = new Date();
    const articleData = {
      title: title.trim(),
      description: description ? description.trim() : "",
      cover_image: cover_image || "",
      sort_order: sort_order ? parseInt(sort_order) : 0,
      status: status || "disabled",
      paragraphs: paragraphs || [],
      create_date: now,
      update_date: now,
    };

    const result = await db.collection("health_articles").add(articleData);

    console.log("文章创建成功，ID:", result.id);

    return {
      code: 0,
      message: "文章创建成功",
      data: {
        article_id: result.id,
      },
    };
  } catch (error) {
    console.error("创建文章失败:", error);
    return {
      code: -1,
      message: "创建文章失败",
      data: null,
    };
  }
}; 