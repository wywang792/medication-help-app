<template>
  <view class="launch-container">
    <!-- 启动页可以显示加载动画或品牌信息 -->
    <view class="loading-content">
      <image src="/static/logo.png" class="logo" mode="aspectFit"></image>
      <text class="app-name">护心小管家</text>
      <text class="loading-text">正在启动...</text>
    </view>
  </view>
</template>

<script setup>
import { onLoad } from "@dcloudio/uni-app";
import StorageUtil from "../../utils/storage.js";
import { contentAPI } from "../../api/index.js";

onLoad(() => {
  console.log("启动页加载");
	
	loadAuditStatusAndNavigate();

  // 延迟一点时间，让启动页显示一下
  setTimeout(() => {
    checkUserAndNavigate();
  }, 1000);
});

// 加载审核状态并导航
const loadAuditStatusAndNavigate = async () => {
  try {
    // 首先获取审核状态
    console.log("开始获取审核状态");
    const result = await contentAPI.getAuditStatus();

    if (result.code === 0) {
      const auditStatus = result.data.auditStatus;
      // 保存审核状态到本地存储
      StorageUtil.setData("auditStatus", auditStatus);
      console.log("审核状态已保存:", auditStatus);
    } else {
      console.error("获取审核状态失败:", result.message);
      // 失败时使用默认值 false（非审核状态）
      StorageUtil.setData("auditStatus", false);
    }
  } catch (error) {
    console.error("获取审核状态出错:", error);
    // 出错时使用默认值 false（非审核状态）
    StorageUtil.setData("auditStatus", false);
  }
};

// 检查用户状态并导航
const checkUserAndNavigate = () => {
  try {
    const isLoggedIn = StorageUtil.isLoggedIn();
    const userInfo = StorageUtil.getUserInfo();

    console.log("用户登录状态:", isLoggedIn);
    console.log("用户信息:", userInfo);

    if (!isLoggedIn || !userInfo) {
      // 未登录，跳转到首页
      console.log("用户未登录，跳转到首页");
      uni.reLaunch({
        url: "/pages/index/index",
      });
      return;
    }

    // if (!userInfo.name) {
    // 	uni.reLaunch({
    // 		url: "/pages/register/register"
    // 	});
    // }

    // 已登录，根据角色跳转
    const userRole = userInfo.role || "patient";
    console.log("用户角色:", userRole);

    if (userRole === "medical" || userRole === "admin") {
      // 医护角色，跳转到医护首页
      console.log("医护角色，跳转到医护首页");
      uni.reLaunch({
        url: "/pages/medical/index",
      });
    } else {
      // 患者角色，跳转到首页
      console.log("患者角色，跳转到首页");
      uni.reLaunch({
        url: "/pages/index/index",
      });
    }
  } catch (error) {
    console.error("启动页导航错误:", error);
    // 出错时默认跳转到首页
    uni.reLaunch({
      url: "/pages/index/index",
    });
  }
};
</script>

<style scoped>
.launch-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.loading-content {
  text-align: center;
}

.logo {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 40rpx;
}

.app-name {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 20rpx;
}

.loading-text {
  display: block;
  font-size: 28rpx;
  color: rgba(51, 51, 51, 0.8);
}
</style>
