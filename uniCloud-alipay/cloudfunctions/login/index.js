"use strict";

const db = uniCloud.database();
const { generateToken } = require("auth");
const crypto = require("crypto");

// 微信小程序配置
const WECHAT_CONFIG = {
  appId: process.env.WECHAT_APP_ID || "wx-your-app-id",
  appSecret: process.env.WECHAT_APP_SECRET || "",
};

exports.main = async (event, context) => {
  const { phone, code, password, wechatCode, loginType = "password" } = event;

  // 验证参数
  if (!phone) {
    return {
      code: 1,
      message: "手机号不能为空",
    };
  }

  // 验证手机号格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return {
      code: 1,
      message: "手机号格式不正确",
    };
  }

  try {
    // 根据登录方式调用不同的登录函数
    if (loginType === "password") {
      return await handlePasswordLogin(phone, password, wechatCode);
    } else if (loginType === "sms") {
      return await handleSmsLogin(phone, code, wechatCode);
    } else {
      return {
        code: 1,
        message: "不支持的登录方式",
      };
    }
  } catch (error) {
    console.error("登录失败:", error);
    return {
      code: 1,
      message: "登录失败，请重试",
    };
  }
};

/**
 * 处理账号密码登录
 * @param {string} phone 手机号
 * @param {string} password 密码
 * @param {string} wechatCode 微信登录code
 * @returns {Object} 登录结果
 */
async function handlePasswordLogin(phone, password, wechatCode) {
  // 验证密码参数
  if (!password) {
    return {
      code: 1,
      message: "密码不能为空",
    };
  }
  if (password.length < 6) {
    return {
      code: 1,
      message: "密码长度不能少于6位",
    };
  }

  const now = Date.now();

  // 查找用户是否存在
  const userResult = await db
    .collection("users")
    .where({
      phone: phone,
    })
    .get();

  if (userResult.data.length === 0) {
    return {
      code: 1,
      message: "用户不存在，请先注册或使用短信验证码登录",
    };
  }

  const user = userResult.data[0];

  // 验证密码
  if (!user.password) {
    return {
      code: 1,
      message: "该账号未设置密码，请使用短信验证码登录",
    };
  }

  if (!verifyPassword(password, user.password)) {
    return {
      code: 1,
      message: "密码错误",
    };
  }

  // 更新微信openid（如果提供了微信登录code）
  if (wechatCode) {
    try {
      const openid = await getWechatOpenid(wechatCode);
      if (!openid) {
        console.log(`用户${user.name}(${user.phone})未获取到openid`);
      }
      if (openid === user.openid) {
        console.log(
          `用户${user.name}(${user.phone})获取到openid(${user.openid})与之前相同`
        );
      }
      if (openid && openid !== user.openid) {
        await db.collection("users").doc(user._id).update({
          openid: openid,
          updateTime: now,
        });
        user.openid = openid;
        user.updateTime = now;
        console.log(
          `用户${user.name}(${user.phone})获取到openid(${user.openid})与之前不同，更新成功`
        );
      }
    } catch (error) {
      console.error("更新微信openid失败:", error);
    }
  }

  // 生成token并保存到数据库
  const token = await generateToken(user);

  // 移除敏感信息
  delete user.password;

  return {
    code: 0,
    message: "登录成功",
    data: {
      ...user,
      token: token,
    },
  };
}

/**
 * 处理短信验证码登录
 * @param {string} phone 手机号
 * @param {string} code 验证码
 * @param {string} wechatCode 微信登录code
 * @returns {Object} 登录结果
 */
async function handleSmsLogin(phone, code, wechatCode) {
  // 验证验证码参数
  if (!code) {
    return {
      code: 1,
      message: "验证码不能为空",
    };
  }
  if (!/^\d{6}$/.test(code)) {
    return {
      code: 1,
      message: "验证码格式不正确",
    };
  }

  const now = Date.now();

  // 查找有效的验证码
  const smsResult = await db
    .collection("sms_codes")
    .where({
      phone: phone,
      code: code,
      expireTime: db.command.gt(now),
      used: false,
    })
    .get();

  if (smsResult.data.length === 0) {
    return {
      code: 1,
      message: "验证码无效或已过期",
    };
  }

  // 标记验证码为已使用
  await db.collection("sms_codes").doc(smsResult.data[0]._id).update({
    used: true,
  });

  // 查找用户是否存在
  const userResult = await db
    .collection("users")
    .where({
      phone: phone,
    })
    .get();

  let user;

  if (userResult.data.length === 0) {
    // 用户不存在，创建新用户
    const openid = wechatCode ? await getWechatOpenid(wechatCode) : null;

    const newUser = {
      phone: phone,
      openid: openid,
      role: "patient",
      status: "active",
      subscriptionCount: 0,
      createTime: now,
      updateTime: now,
    };

    const createResult = await db.collection("users").add(newUser);
    user = {
      _id: createResult.id,
      ...newUser,
    };
  } else {
    user = userResult.data[0];

    // 更新微信openid（如果提供了微信登录code）
    if (wechatCode) {
      try {
        const openid = await getWechatOpenid(wechatCode);
        if (openid && openid !== user.openid) {
          await db.collection("users").doc(user._id).update({
            openid: openid,
            updateTime: now,
          });
          user.openid = openid;
          user.updateTime = now;
        }
      } catch (error) {
        console.error("更新微信openid失败:", error);
      }
    }
  }

  // 生成token并保存到数据库
  const token = await generateToken(user);

  // 移除敏感信息
  delete user.password;

  return {
    code: 0,
    message: "登录成功",
    data: {
      ...user,
      token: token,
    },
  };
}

/**
 * 获取微信openid
 * @param {string} code 微信登录code
 * @returns {string|null} openid
 */
async function getWechatOpenid(code) {
  try {
    const result = await uniCloud.httpclient.request(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_CONFIG.appId}&secret=${WECHAT_CONFIG.appSecret}&js_code=${code}&grant_type=authorization_code`,
      {
        method: "GET",
        dataType: "json",
      }
    );

    if (result.data && result.data.openid) {
      return result.data.openid;
    } else {
      console.log("获取微信openid失败:", res.data.errmsg);
    }
    return null;
  } catch (error) {
    console.error("获取微信openid失败:", error);
    return null;
  }
}

/**
 * 验证密码
 * @param {string} inputPassword 输入的密码
 * @param {string} hashedPassword 加密后的密码
 * @returns {boolean} 是否匹配
 */
function verifyPassword(inputPassword, hashedPassword) {
  return hashPassword(inputPassword) === hashedPassword;
}

/**
 * 密码加密
 * @param {string} password 原始密码
 * @returns {string} 加密后的密码
 */
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}
