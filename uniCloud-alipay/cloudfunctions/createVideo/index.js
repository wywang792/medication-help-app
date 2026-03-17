"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
  try {
    const {
      title,
      description,
      video_url,
      cover_image,
      duration,
      sort_order,
      status,
    } = event;

    // 验证必填字段
    if (!title || !title.trim()) {
      return {
        code: -1,
        message: "视频标题不能为空",
        data: null,
      };
    }

    if (!video_url || !video_url.trim()) {
      return {
        code: -1,
        message: "视频链接不能为空",
        data: null,
      };
    }

    console.log("开始创建视频:", { title, description });

    const now = new Date();
    const videoData = {
      title: title.trim(),
      description: description ? description.trim() : "",
      video_url: video_url.trim(),
      cover_image: cover_image || "",
      duration: duration ? parseInt(duration) : null,
      sort_order: sort_order ? parseInt(sort_order) : 0,
      status: status || "disabled",
      create_date: now,
      update_date: now,
    };

    const result = await db.collection("health_videos").add(videoData);

    console.log("视频创建成功，ID:", result.id);

    return {
      code: 0,
      message: "视频创建成功",
      data: {
        video_id: result.id,
      },
    };
  } catch (error) {
    console.error("创建视频失败:", error);
    return {
      code: -1,
      message: "创建视频失败",
      data: null,
    };
  }
};
