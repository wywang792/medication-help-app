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

    console.log("开始获取视频详情，ID:", video_id);

    const result = await db
      .collection("health_videos")
      .doc(video_id)
      .get();

    if (result.data && result.data.length > 0) {
      console.log("视频详情获取成功");
      return {
        code: 0,
        message: "获取视频详情成功",
        data: {
          video: result.data[0],
        },
      };
    } else {
      return {
        code: -1,
        message: "视频不存在",
        data: null,
      };
    }
  } catch (error) {
    console.error("获取视频详情失败:", error);
    return {
      code: -1,
      message: "获取视频详情失败",
      data: null,
    };
  }
}; 