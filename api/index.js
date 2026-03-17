import StorageUtil from "../utils/storage.js";

/**
 * API请求封装
 * @param {string} name 云函数名称
 * @param {Object} data 请求数据
 * @param {boolean} needAuth 是否需要认证
 * @returns {Promise} 请求结果
 */
export const request = async (name, data = {}, needAuth = true) => {
  try {
    // 如果需要认证，添加token到请求头
    const requestData = { ...data };

    if (needAuth) {
      const token = StorageUtil.getToken();
      if (!token) {
        // 没有token，跳转到登录页
        handleAuthError();
        return {
          code: 401,
          message: "未登录或登录已过期",
        };
      }
      requestData.token = token;
    }

    console.log(`调用云函数: ${name}`, requestData);

    const result = await uniCloud.callFunction({
      name,
      data: requestData,
    });

    console.log(`云函数 ${name} 返回结果:`, result.result);

    // 处理认证错误
    if (result.result.code === 401) {
      handleAuthError();
    }

    return result.result;
  } catch (error) {
    console.error(`调用云函数 ${name} 失败:`, error);
    return {
      code: -1,
      message: "网络请求失败，请重试",
      error: error.message,
    };
  }
};

/**
 * 处理认证错误
 */
const handleAuthError = () => {
  console.log("认证失败，清除用户数据并跳转到首页");

  // 清除用户数据
  StorageUtil.clearUserData();

  // 跳转到首页
  uni.reLaunch({
    url: "/pages/launch/launch",
  });
};

/**
 * 登录相关API
 */
export const authAPI = {
  // 发送验证码
  sendSmsCode: (phone) => request("sendSmsCode", { phone }, false),

  // 账号密码登录
  loginWithPassword: (phone, password, wechatCode) =>
    request(
      "login",
      { phone, password, wechatCode, loginType: "password" },
      false
    ),

  // 短信验证码登录
  loginWithSms: (phone, code, wechatCode) =>
    request("login", { phone, code, wechatCode, loginType: "sms" }, false),

  // 兼容旧版本的登录接口
  login: (phone, code, wechatCode) =>
    request("login", { phone, code, wechatCode, loginType: "sms" }, false),

  // 注册
  register: (userData) => request("register", userData, false),

  // 密码重置
  resetPassword: (phone, code, newPassword) =>
    request("resetPassword", { phone, code, newPassword }, false),
};

/**
 * 用药提醒相关API
 */
export const reminderAPI = {
  // 获取今日提醒
  getTodayReminders: () => request("getTodayReminders", {}, true),

  // 确认用药（单个时间点）
  confirmMedication: (reminderId) =>
    request("confirmMedication", { reminder_id: reminderId }, true),
};

/**
 * 积分相关API
 */
export const pointsAPI = {
  // 获取用户积分
  getUserPoints: () => request("getUserPoints", {}, true),

  // 增加用户积分
  addUserPoints: (points, description, related_id, related_type) =>
    request(
      "addUserPoints",
      { points, description, related_id, related_type },
      true
    ),
};

/**
 * 商品相关API
 */
export const productAPI = {
  // 获取商品列表
  getProducts: (category_id) => request("getProducts", { category_id }, false),

  // 兑换商品
  exchangeProduct: (product_id) =>
    request("exchangeProduct", { product_id }, true),

  // 获取兑换记录
  getExchangeHistory: () => request("getExchangeHistory", {}, true),

  // 获取患者商品记录（医护人员使用）
  getPatientProducts: (patient_id) =>
    request("getPatientProducts", { patient_id }, true),

  // 更新兑换状态（医护人员使用）
  updateExchangeStatus: (user_product_id, status, notes) =>
    request("updateExchangeStatus", { user_product_id, status, notes }, true),
};

/**
 * 内容相关API
 */
export const contentAPI = {
  // 获取科普内容
  getPublicContent: () => request("getPublicContent", {}, false),

  // 初始化科普内容
  initPublicContent: () => request("initPublicContent", {}, false),

  // 获取审核状态
  getAuditStatus: () => request("getAuditStatus", {}, false),

  // 获取健康视频列表
  getHealthVideos: () => request("getHealthVideos", {}, true),

  // 获取视频详情
  getVideoDetail: (videoId) =>
    request("getVideoDetail", { video_id: videoId }, true),

  // 创建视频
  createVideo: (videoData) => request("createVideo", videoData, true),

  // 更新视频
  updateVideo: (videoId, videoData) =>
    request("updateVideo", { video_id: videoId, ...videoData }, true),

  // 更新视频状态
  updateVideoStatus: (videoId, statusData) =>
    request("updateVideoStatus", { video_id: videoId, ...statusData }, true),

  // 删除视频
  deleteVideo: (videoId) => request("deleteVideo", { video_id: videoId }, true),

  // 获取健康文章列表
  getHealthArticles: () => request("getHealthArticles", {}, true),

  // 获取文章详情
  getArticleDetail: (articleId) =>
    request("getArticleDetail", { article_id: articleId }, true),

  // 创建文章
  createArticle: (articleData) => request("createArticle", articleData, true),

  // 更新文章
  updateArticle: (articleId, articleData) =>
    request("updateArticle", { article_id: articleId, ...articleData }, true),

  // 更新文章状态
  updateArticleStatus: (articleId, statusData) =>
    request(
      "updateArticleStatus",
      { article_id: articleId, ...statusData },
      true
    ),

  // 删除文章
  deleteArticle: (articleId) =>
    request("deleteArticle", { article_id: articleId }, true),
};

/**
 * 医护相关API
 */
export const patientAPI = {
  // 获取患者列表
  getPatientList: () => request("getPatientList", {}, true),

  // 获取患者详情
  getPatientDetail: (patientId) =>
    request("getPatientDetail", { patient_id: patientId }, true),

  // 添加患者
  addPatient: (patientData) => request("addPatient", patientData, true),

  // 更新患者信息
  updatePatient: (patientId, patientData) =>
    request("updatePatient", { patient_id: patientId, ...patientData }, true),

  // 添加用药
  addMedication: (medicationData) =>
    request("addMedication", medicationData, true),

  // 修改用药计划
  updateMedicationPlan: (planId, timeSlots) =>
    request(
      "updateMedicationPlan",
      { plan_id: planId, time_slots: timeSlots },
      true
    ),

  // 删除用药计划
  deleteMedicationPlan: (planId) =>
    request("deleteMedicationPlan", { plan_id: planId }, true),

  // 获取用药计划详情
  getMedicationPlanDetail: (planId) =>
    request("getMedicationPlanDetail", { plan_id: planId }, true),

  // 获取最近活动（医护端首页）
  getRecentActivities: () => request("getRecentActivities", {}, true),

  // 发送用药提醒
  sendMedicationReminder: (reminderId) =>
    request("sendSubscriptionMessage", { reminder_id: reminderId }, true),
};

/**
 * 患者相关API
 */
export const patientUserAPI = {
  // 获取患者用药记录
  getPatientMedicationLogs: (page = 1, pageSize = 20) =>
    request("getPatientMedicationLogs", { page, pageSize }, true),

  // 获取患者积分记录
  getPatientPointsLogs: (page = 1, pageSize = 20) =>
    request("getPatientPointsLogs", { page, pageSize }, true),

  // 增加订阅次数
  addSubscriptionCount: () => request("addSubscriptionCount", {}, true),
};

/**
 * 测试相关API
 */
export const testAPI = {
  // 初始化测试数据
  initTestData: () => request("initTestData", {}, false),

  // 初始化测试用药数据
  initTestMedications: () => request("initTestMedications", {}, false),

  // 初始化测试商品数据
  initTestProducts: () => request("initTestProducts", {}, false),

  // 初始化测试视频数据
  initTestVideos: () => request("initTestVideos", {}, false),
};

/**
 * 微信工具相关API
 */
export const wechatAPI = {
  // 获取微信openid
  getOpenid: (code) =>
    request("wechatUtils", { action: "getOpenid", code }, false),

  // 获取access_token
  getAccessToken: () =>
    request("wechatUtils", { action: "getAccessToken" }, false),

  // 发送订阅消息
  sendSubscribeMessage: (
    openid,
    template_id,
    data,
    page,
    miniprogram_state,
    lang
  ) =>
    request(
      "wechatUtils",
      {
        action: "sendSubscribeMessage",
        openid,
        template_id,
        data,
        page,
        miniprogram_state,
        lang,
      },
      false
    ),
};

export default {
  request,
  authAPI,
  reminderAPI,
  pointsAPI,
  productAPI,
  contentAPI,
  patientAPI,
  patientUserAPI,
  testAPI,
  wechatAPI,
};
