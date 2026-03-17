"use strict";

const db = uniCloud.database();

// 微信小程序配置
const WECHAT_CONFIG = {
  appId: "wxe40bfc113c64f85f",
  appSecret: "5689b2012d978495dd8da6c785c4fdbd",
};

exports.main = async (event, context) => {
  try {
    console.log("开始刷新access_token");

    const now = Date.now();

    // 查询当前最新的access_token
    const tokenResult = await db
      .collection("wechat_access_token")
      .orderBy("create_time", "desc")
      .limit(1)
      .get();

    let needRefresh = true;

    if (tokenResult.data.length > 0) {
      const tokenRecord = tokenResult.data[0];
      const expireTime =
        tokenRecord.create_time + tokenRecord.expires_in * 1000;

      // 如果access_token还有效（提前10分钟刷新），则不需要刷新
      if (now < expireTime - 10 * 60 * 1000) {
        console.log("access_token还有效，无需刷新");
        needRefresh = false;
      }
    }

    if (needRefresh) {
      console.log("开始获取新的access_token");

      const response = await uniCloud.httpclient.request(
        "https://api.weixin.qq.com/cgi-bin/token",
        {
          method: "GET",
          data: {
            grant_type: "client_credential",
            appid: WECHAT_CONFIG.appId,
            secret: WECHAT_CONFIG.appSecret,
          },
          dataType: "json",
          timeout: 10000,
        }
      );

      console.log("获取access_token响应:", response.data);

      if (response.data.access_token) {
        // 保存到数据库
        const tokenData = {
          access_token: response.data.access_token,
          expires_in: response.data.expires_in,
          create_time: now,
          update_time: now,
        };

        await db.collection("wechat_access_token").add(tokenData);

        console.log("access_token刷新成功");
        return {
          code: 0,
          message: "access_token刷新成功",
          data: {
            access_token: response.data.access_token,
            expires_in: response.data.expires_in,
          },
        };
      } else {
        console.error("获取access_token失败:", response.data);
        return {
          code: -1,
          message: "获取access_token失败",
          error: response.data.errmsg || "未知错误",
        };
      }
    } else {
      return {
        code: 0,
        message: "access_token还有效，无需刷新",
      };
    }
  } catch (error) {
    console.error("刷新access_token异常:", error);
    return {
      code: -1,
      message: "刷新access_token失败",
      error: error.message,
    };
  }
};
