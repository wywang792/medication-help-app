"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
  try {
    const { video_id } = event;

    if (!video_id) {
      return {
        code: -1,
        message: "视频ID不能为空",
        data: null,
      };
    }

    console.log("开始删除视频，ID:", video_id);

    const result = await db.collection("health_videos").doc(video_id).remove();

    console.log("视频删除成功");

    return {
      code: 0,
      message: "视频删除成功",
      data: {
        deleted: result.deleted,
      },
    };
  } catch (error) {
    console.error("删除视频失败:", error);
    return {
      code: -1,
      message: "删除视频失败",
      data: null,
    };
  }
};
