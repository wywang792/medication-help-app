"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
  try {
    const { video_id, status } = event;

    if (!video_id) {
      return {
        code: -1,
        message: "视频ID不能为空",
        data: null,
      };
    }

    if (!status || !["enabled", "disabled"].includes(status)) {
      return {
        code: -1,
        message: "状态值无效",
        data: null,
      };
    }

    console.log("开始更新视频状态，ID:", video_id, "状态:", status);

    const now = new Date();

    // 如果要启用当前视频，先禁用所有其他视频
    if (status === "enabled") {
      await db
        .collection("health_videos")
        .where({
          _id: db.command.neq(video_id),
        })
        .update({
          status: "disabled",
          update_date: now,
        });
      console.log("已禁用其他视频");
    }

    // 更新当前视频状态
    const result = await db
      .collection("health_videos")
      .doc(video_id)
      .update({
        status: status,
        update_date: now,
      });

    console.log("视频状态更新成功");

    return {
      code: 0,
      message: "视频状态更新成功",
      data: {
        updated: result.updated,
      },
    };
  } catch (error) {
    console.error("更新视频状态失败:", error);
    return {
      code: -1,
      message: "更新视频状态失败",
      data: null,
    };
  }
}; 