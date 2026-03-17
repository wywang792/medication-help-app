"use strict";

const {
  authenticate,
  revokeToken,
  revokeAllUserTokens,
  cleanExpiredTokens,
} = require("auth");

exports.main = async (event, context) => {
  const { action, userId, token } = event;

  // 如果是清理过期token，不需要认证
  if (action === "cleanExpired") {
    try {
      const count = await cleanExpiredTokens();
      return {
        code: 0,
        message: "清理过期token成功",
        data: {
          cleaned_count: count,
        },
      };
    } catch (error) {
      console.error("清理过期token失败:", error);
      return {
        code: -1,
        message: "清理过期token失败",
        error: error.message,
      };
    }
  }

  // 其他操作需要认证
  const authResult = await authenticate(event);
  if (!authResult.success) {
    return {
      code: authResult.code,
      message: authResult.message,
    };
  }

  const userInfo = authResult.userInfo;

  // 检查权限（只有管理员可以撤销其他用户的token）
  if (userInfo.role !== "admin" && action !== "revokeSelf") {
    return {
      code: 403,
      message: "权限不足，只有管理员可以撤销其他用户的token",
    };
  }

  try {
    switch (action) {
      case "revokeSelf":
        // 撤销当前用户的token（登出）
        const revokeSelfResult = await revokeToken(event.token);
        return {
          code: 0,
          message: revokeSelfResult ? "登出成功" : "登出失败",
          data: {
            success: revokeSelfResult,
          },
        };

      case "revokeToken":
        // 撤销指定的token
        if (!token) {
          return {
            code: -1,
            message: "token参数不能为空",
          };
        }
        const revokeTokenResult = await revokeToken(token);
        return {
          code: 0,
          message: revokeTokenResult ? "撤销token成功" : "撤销token失败",
          data: {
            success: revokeTokenResult,
          },
        };

      case "revokeAllUserTokens":
        // 撤销指定用户的所有token（强制用户登出）
        if (!userId) {
          return {
            code: -1,
            message: "userId参数不能为空",
          };
        }
        const count = await revokeAllUserTokens(userId);
        return {
          code: 0,
          message: `成功撤销用户的${count}个token`,
          data: {
            revoked_count: count,
          },
        };

      default:
        return {
          code: -1,
          message: "不支持的操作类型",
        };
    }
  } catch (error) {
    console.error("撤销token失败:", error);
    return {
      code: -1,
      message: "操作失败",
      error: error.message,
    };
  }
};
