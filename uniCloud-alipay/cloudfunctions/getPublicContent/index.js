"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
  try {
    console.log("开始获取科普内容");

    // 并行获取科普视频和文章
    const [videoResult, articlesResult] = await Promise.allSettled([
      getHealthVideos(),
      getHealthArticles(),
    ]);

    const response = {
      code: 0,
      message: "获取科普内容成功",
      data: {
        video: null,
        articles: [],
      },
    };

    // 处理视频结果
    if (videoResult.status === "fulfilled" && videoResult.value) {
      response.data.video = videoResult.value;
      console.log("科普视频获取成功");
    } else {
      console.error("科普视频获取失败:", videoResult.reason);
    }

    // 处理文章结果
    if (articlesResult.status === "fulfilled" && articlesResult.value) {
      response.data.articles = articlesResult.value;
      console.log("科普文章获取成功，数量:", articlesResult.value.length);
    } else {
      console.error("科普文章获取失败:", articlesResult.reason);
    }

    return response;
  } catch (error) {
    console.error("获取科普内容失败:", error);
    return {
      code: -1,
      message: "获取科普内容失败",
      data: {
        video: null,
        articles: [],
      },
    };
  }
};

// 获取今日科普视频
async function getHealthVideos() {
  try {
    const videoResult = await db
      .collection("health_videos")
      .where({
        status: "enabled",
      })
      .limit(1)
      .get();

    if (videoResult.data && videoResult.data.length > 0) {
      return videoResult.data[0];
    }

    return videoResult.data && videoResult.data.length > 0
      ? videoResult.data[0]
      : null;
  } catch (error) {
    console.error("获取科普视频失败:", error);
    return null;
  }
}

// 获取健康科普文章
async function getHealthArticles() {
  try {
    const articlesResult = await db
      .collection("health_articles")
      .where({
        status: "published",
      })
      .orderBy("publish_date", "desc")
      .limit(5) // 限制返回5篇文章
      .get();

    return articlesResult.data || [];
  } catch (error) {
    console.error("获取科普文章失败:", error);
    return [];
  }
}
