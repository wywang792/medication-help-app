"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
  try {
    console.log("开始获取健康视频列表");

    const result = await db
      .collection("health_videos")
      .orderBy("sort_order", "asc")
      .orderBy("create_date", "desc")
      .get();

    console.log("健康视频列表获取成功，数量:", result.data.length);

    return {
      code: 0,
      message: "获取健康视频列表成功",
      data: {
        videos: result.data,
      },
    };
  } catch (error) {
    console.error("获取健康视频列表失败:", error);
    return {
      code: -1,
      message: "获取健康视频列表失败",
      data: {
        videos: [],
      },
    };
  }
}; 