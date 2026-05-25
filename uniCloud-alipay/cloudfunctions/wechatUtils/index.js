"use strict";

const db = uniCloud.database();

// 微信小程序配置
const WECHAT_CONFIG = {
  appId: process.env.WECHAT_APP_ID || "wx-your-app-id",
  appSecret: process.env.WECHAT_APP_SECRET || "",
};

exports.main = async (event, context) => {
  const { action, code } = event;

  try {
    switch (action) {
      case "getOpenid":
        return await getWechatOpenid(code);
      case "getAccessToken":
        return await getAccessToken();
      case "sendSubscribeMessage":
        return await sendSubscribeMessage(event);
      default:
        return {
          code: -1,
          message: "未知的操作类型",
        };
    }
  } catch (error) {
    console.error("微信工具函数执行失败:", error);
    return {
      code: -1,
      message: "操作失败",
      error: error.message,
    };
  }
};

// 获取微信openid
async function getWechatOpenid(code) {
  try {
    console.log("开始获取微信openid，code:", code);

    const response = await uniCloud.httpclient.request(
      "https://api.weixin.qq.com/sns/jscode2session",
      {
        method: "GET",
        data: {
          appid: WECHAT_CONFIG.appId,
          secret: WECHAT_CONFIG.appSecret,
          js_code: code,
          grant_type: "authorization_code",
        },
        dataType: "json",
        timeout: 10000,
      }
    );

    console.log("微信API响应:", response.data);

    if (response.data.openid) {
      console.log("成功获取openid:", response.data.openid);
      return {
        code: 0,
        message: "获取openid成功",
        data: {
          openid: response.data.openid,
          session_key: response.data.session_key,
        },
      };
    } else {
      console.error("获取openid失败:", response.data);
      return {
        code: -1,
        message: "获取openid失败",
        error: response.data.errmsg || "未知错误",
      };
    }
  } catch (error) {
    console.error("获取微信openid异常:", error);
    return {
      code: -1,
      message: "获取openid失败",
      error: error.message,
    };
  }
}

// 获取access_token
async function getAccessToken() {
  try {
    const now = Date.now();

    // 先查询数据库中是否有有效的access_token
    const tokenResult = await db
      .collection("wechat_access_token")
      .orderBy("create_time", "desc")
      .limit(1)
      .get();

    if (tokenResult.data.length > 0) {
      const tokenRecord = tokenResult.data[0];
      const expireTime =
        tokenRecord.create_time + tokenRecord.expires_in * 1000;

      // 如果access_token还有效（提前5分钟刷新）
      if (now < expireTime - 5 * 60 * 1000) {
        console.log("使用缓存的access_token");
        return {
          code: 0,
          message: "获取access_token成功",
          data: {
            access_token: tokenRecord.access_token,
          },
        };
      }
    }

    // 重新获取access_token
    console.log("重新获取access_token");
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

      console.log("access_token已保存到数据库");
      return {
        code: 0,
        message: "获取access_token成功",
        data: {
          access_token: response.data.access_token,
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
  } catch (error) {
    console.error("获取access_token异常:", error);
    return {
      code: -1,
      message: "获取access_token失败",
      error: error.message,
    };
  }
}

// 发送订阅消息
async function sendSubscribeMessage(params) {
  try {
    const { openid, template_id, data, page, miniprogram_state, lang } = params;

    if (!openid || !template_id || !data) {
      return {
        code: -1,
        message: "参数不完整",
      };
    }

    // 获取access_token
    const tokenResult = await getAccessToken();
    if (tokenResult.code !== 0) {
      return tokenResult;
    }

    const access_token = tokenResult.data.access_token;

    // 构建请求参数
    const requestData = {
      touser: openid,
      template_id: template_id,
      data: data,
      miniprogram_state: miniprogram_state || "formal",
      lang: lang || "zh_CN",
    };

    // 如果提供了page参数，则添加到请求中
    if (page) {
      requestData.page = page;
    }

    // 发送订阅消息
    const response = await uniCloud.httpclient.request(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${access_token}`,
      {
        method: "POST",
        data: requestData,
        dataType: "json",
        contentType: "json",
        timeout: 10000,
      }
    );

    console.log("发送订阅消息响应:", response.data);

    if (response.data.errcode === 0) {
      console.log("订阅消息发送成功");
      return {
        code: 0,
        message: "订阅消息发送成功",
      };
    } else {
      console.error("订阅消息发送失败:", response.data);
      return {
        code: -1,
        message: "订阅消息发送失败",
        error: response.data.errmsg || "未知错误",
      };
    }
  } catch (error) {
    console.error("发送订阅消息异常:", error);
    return {
      code: -1,
      message: "发送订阅消息失败",
      error: error.message,
    };
  }
}
