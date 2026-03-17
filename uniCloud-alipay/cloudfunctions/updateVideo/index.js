"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
  try {
    const {
      video_id,
      title,
      description,
      video_url,
      cover_image,
      duration,
      sort_order,
      status,
    } = event;

    if (!video_id) {
      return {
        code: -1,
        message: "视频ID不能为空",
        data: null,
      };
    }

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

    console.log("开始更新视频，ID:", video_id);

    const now = new Date();
    const updateData = {
      title: title.trim(),
      description: description ? description.trim() : "",
      video_url: video_url.trim(),
      cover_image: cover_image || "",
      duration: duration ? parseInt(duration) : null,
      sort_order: sort_order ? parseInt(sort_order) : 0,
      status: status || "disabled",
      update_date: now,
    };

    const result = await db
      .collection("health_videos")
      .doc(video_id)
      .update(updateData);

    console.log("视频更新成功");

    return {
      code: 0,
      message: "视频更新成功",
      data: {
        updated: result.updated,
      },
    };
  } catch (error) {
    console.error("更新视频失败:", error);
    return {
      code: -1,
      message: "更新视频失败",
      data: null,
    };
  }
};
