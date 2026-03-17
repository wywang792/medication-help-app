"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
  try {
    console.log("开始获取审核状态");

    const auditStatus = await getAuditStatus();

    return {
      code: 0,
      message: "获取审核状态成功",
      data: {
        auditStatus: auditStatus,
      },
    };
  } catch (error) {
    console.error("获取审核状态失败:", error);
    return {
      code: -1,
      message: "获取审核状态失败",
      data: {
        auditStatus: false, // 默认非审核状态
      },
    };
  }
};

// 获取审核状态
async function getAuditStatus() {
  try {
    const settingsResult = await db
      .collection("app_settings")
      .where({
        key: "auditStatus",
      })
      .limit(1)
      .get();

    if (settingsResult.data && settingsResult.data.length > 0) {
      return settingsResult.data[0].value; // 返回布尔值
    }

    // 如果没有找到设置，返回默认值 false（非审核状态）
    return false;
  } catch (error) {
    console.error("获取审核状态失败:", error);
    // 出错时返回默认值 false（非审核状态）
    return false;
  }
}
