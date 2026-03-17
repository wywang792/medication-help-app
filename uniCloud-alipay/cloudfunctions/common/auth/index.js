const jwt = require("jsonwebtoken");
const db = uniCloud.database();

// JWT密钥，实际项目中应该存储在环境变量中
const JWT_SECRET = "your-jwt-secret-key-2024";

/**
 * 验证JWT token
 * @param {string} token JWT token
 * @returns {Promise<Object|null>} 解码后的用户信息或null
 */
async function verifyToken(token) {
  try {
    if (!token) {
      return null;
    }

    // 先查询数据库，确认token是否存在且有效
    const tokenRecord = await db
      .collection("user_tokens")
      .where({
        token: token,
        status: "active",
      })
      .get();

    // 如果数据库中找不到token或token已被撤销，则认为无效
    if (!tokenRecord.data || tokenRecord.data.length === 0) {
      console.error("Token在数据库中不存在或已被撤销");
      return null;
    }

    // 检查token是否过期
    const tokenData = tokenRecord.data[0];
    if (tokenData.expireTime < Date.now()) {
      console.error("Token已过期");
      // 标记过期的token为已撤销
      await db.collection("user_tokens").doc(tokenData._id).update({
        status: "revoked",
      });
      return null;
    }

    // 最后验证JWT的有效性
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error("Token验证失败:", error.message);
		return null;
  }
}

/**
 * 生成JWT token并保存到数据库
 * @param {Object} userInfo 用户信息
 * @param {string} device 设备信息（可选）
 * @returns {Promise<string>} JWT token
 */
async function generateToken(userInfo, device = "") {
  try {
    const now = Math.floor(Date.now() / 1000);
    const expireSeconds = 7 * 24 * 60 * 60; // 7天

    const payload = {
      userId: userInfo._id,
      phone: userInfo.phone,
      role: userInfo.role,
      iat: now,
      exp: now + expireSeconds,
    };

    const token = jwt.sign(payload, JWT_SECRET);

    // 保存token到数据库
    await db.collection("user_tokens").add({
      user_id: userInfo._id,
      token: token,
      createTime: Date.now(),
      expireTime: Date.now() + expireSeconds * 1000,
      device: device,
      status: "active",
    });

    return token;
  } catch (error) {
    console.error("生成Token失败:", error);
    throw error;
  }
}

/**
 * 认证中间件
 * @param {Object} event 云函数事件对象
 * @returns {Promise<Object>} 包含认证结果和用户信息
 */
async function authenticate(event) {
  const { token } = event;

  if (!token) {
    return {
      success: false,
      code: 401,
      message: "缺少认证token",
      userInfo: null,
    };
  }

  const userInfo = await verifyToken(token);

  if (!userInfo) {
    return {
      success: false,
      code: 401,
      message: "token无效或已过期",
      userInfo: null,
    };
  }

  return {
    success: true,
    code: 0,
    message: "认证成功",
    userInfo: userInfo,
  };
}

/**
 * 撤销指定的token
 * @param {string} token JWT token
 * @returns {Promise<boolean>} 是否撤销成功
 */
async function revokeToken(token) {
  try {
    const result = await db
      .collection("user_tokens")
      .where({
        token: token,
      })
      .update({
        status: "revoked",
      });

    return result.updated > 0;
  } catch (error) {
    console.error("撤销Token失败:", error);
    return false;
  }
}

/**
 * 撤销指定用户的所有token（强制登出）
 * @param {string} userId 用户ID
 * @returns {Promise<number>} 撤销的token数量
 */
async function revokeAllUserTokens(userId) {
  try {
    const result = await db
      .collection("user_tokens")
      .where({
        user_id: userId,
        status: "active",
      })
      .update({
        status: "revoked",
      });

    return result.updated || 0;
  } catch (error) {
    console.error("撤销用户所有Token失败:", error);
    return 0;
  }
}

/**
 * 清理过期的token记录
 * @returns {Promise<number>} 清理的token数量
 */
async function cleanExpiredTokens() {
  try {
    const result = await db
      .collection("user_tokens")
      .where({
        expireTime: db.command.lt(Date.now()),
        status: "active",
      })
      .update({
        status: "revoked",
      });

    return result.updated || 0;
  } catch (error) {
    console.error("清理过期Token失败:", error);
    return 0;
  }
}

module.exports = {
  verifyToken,
  generateToken,
  authenticate,
  revokeToken,
  revokeAllUserTokens,
  cleanExpiredTokens,
  JWT_SECRET,
};
