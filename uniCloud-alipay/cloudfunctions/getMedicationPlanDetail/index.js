"use strict";

const db = uniCloud.database();
const { authenticate } = require("auth");

exports.main = async (event, context) => {
  // 验证token
  const authResult = await authenticate(event);
  if (!authResult.success) {
    return {
      code: authResult.code,
      message: authResult.message,
    };
  }

  const userInfo = authResult.userInfo;
  const { plan_id } = event;

  // 参数验证
  if (!plan_id) {
    return {
      code: -1,
      message: "用药计划ID不能为空",
    };
  }

  try {
    console.log("获取用药计划详情，计划ID:", plan_id);

    // 获取用药计划
    const planResult = await db
      .collection("medication_plan")
      .doc(plan_id)
      .get();
    if (planResult.data.length === 0) {
      return {
        code: -1,
        message: "用药计划不存在",
      };
    }

    const plan = planResult.data[0];

    // 检查权限：只有医护人员可以查看用药计划详情
    if (userInfo.role !== "medical" && userInfo.role !== "admin") {
      return {
        code: 403,
        message: "权限不足，只有医护人员可以查看用药计划详情",
      };
    }

    // 格式化日期
    const startDate = new Date(plan.start_date);
    const endDate = new Date(plan.end_date);

    const formattedPlan = {
      ...plan,
      start_date_formatted: startDate.toISOString().split("T")[0],
      end_date_formatted: endDate.toISOString().split("T")[0],
    };

    console.log("获取用药计划详情成功");

    return {
      code: 0,
      message: "获取用药计划详情成功",
      data: {
        plan: formattedPlan,
      },
    };
  } catch (error) {
    console.error("获取用药计划详情失败:", error);
    return {
      code: -1,
      message: "获取用药计划详情失败",
      error: error.message,
    };
  }
};
