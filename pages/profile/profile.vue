<template>
  <scroll-view class="profile-page" scroll-y>
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view v-if="isLoggedIn" class="user-info">
        <view class="avatar-section">
          <u-avatar
            size="80"
						bg-color="#ffb34b"
            :src="userInfo.avatar"
            :text="userInfo.name?.charAt(0) || 'U'"
          ></u-avatar>
        </view>
        <view class="user-details">
          <text class="user-name">{{ userInfo.name || "亲爱的用户" }}</text>
          <text class="user-phone">{{ formatPhone(userInfo.phone) }}</text>
          <view class="user-stats">
            <view class="stat-item" v-if="userInfo.hospitalNumber">
              <text class="stat-value">{{ userInfo.hospitalNumber }}</text>
              <text class="stat-label">备注</text>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="login-prompt" @click="goToLogin">
        <u-avatar size="80" text="U" bg-color="#ffb34b"></u-avatar>
        <text class="login-text">点击登录</text>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section">
      <view class="menu-group">
        <view class="menu-item" @click="goToMedicationHistory">
          <view class="menu-left">
            <u-icon name="clock" size="24" color="#007AFF"></u-icon>
            <text class="menu-text">用药记录</text>
          </view>
          <u-icon name="arrow-right" size="16" color="#CCCCCC"></u-icon>
        </view>

        <view class="menu-item" @click="goToPointsHistory">
          <view class="menu-left">
            <u-icon name="gift" size="24" color="#FF9800"></u-icon>
            <text class="menu-text">积分记录</text>
          </view>
          <u-icon name="arrow-right" size="16" color="#CCCCCC"></u-icon>
        </view>

        <view class="menu-item">
          <view class="menu-left">
            <u-icon name="bell" size="24" color="#4ECDC4"></u-icon>
            <text class="menu-text">订阅次数</text>
          </view>
          <view class="menu-right">
            <text class="subscription-count">{{ userInfo.subscriptionCount || 0 }}次</text>
          </view>
        </view>

        <!-- 订阅按钮 -->
        <view class="subscription-section">
          <u-button
            type="primary"
            :loading="subscribing"
            @click="subscribeNotification"
            :custom-style="{ width: '100%', marginTop: '20rpx' }"
          >
            <u-icon name="plus" size="16" color="#FFFFFF" style="marginRight: '8rpx'"></u-icon>
            {{ subscribing ? "订阅中..." : "点击增加订阅次数" }}
          </u-button>
        </view>
      </view>

      <view v-if="isLoggedIn" class="menu-group">
				<view class="menu-item" @click="logout">
				  <view class="menu-left">
				    <u-icon name="home" size="24" color="#f56c6c"></u-icon>
				    <text class="menu-text">退出登录</text>
				  </view>
				</view>
				
        <!-- <view class="menu-item" @click="goToSettings">
          <view class="menu-left">
            <u-icon name="setting" size="24" color="#4ECDC4"></u-icon>
            <text class="menu-text">设置</text>
          </view>
          <u-icon name="arrow-right" size="16" color="#CCCCCC"></u-icon>
        </view>

        <view class="menu-item" @click="goToHelp">
          <view class="menu-left">
            <u-icon name="question-circle" size="24" color="#9C27B0"></u-icon>
            <text class="menu-text">帮助与反馈</text>
          </view>
          <u-icon name="arrow-right" size="16" color="#CCCCCC"></u-icon>
        </view>

        <view class="menu-item" @click="goToAbout">
          <view class="menu-left">
            <u-icon name="info-circle" size="24" color="#607D8B"></u-icon>
            <text class="menu-text">关于我们</text>
          </view>
          <u-icon name="arrow-right" size="16" color="#CCCCCC"></u-icon>
        </view> -->
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import StorageUtil from "../../utils/storage.js";
import { patientUserAPI } from "../../api/index.js";

const userInfo = ref({});
const subscribing = ref(false);
const SUBSCRIBE_TEMPLATE_ID = "your-subscribe-template-id";

// 计算属性：是否已登录
const isLoggedIn = computed(() => {
  return StorageUtil.isLoggedIn();
});

onMounted(() => {
  loadUserInfo();
});

// 加载用户信息
const loadUserInfo = () => {
  if (isLoggedIn.value) {
    userInfo.value = StorageUtil.getUserInfo();
  }
};

// 格式化手机号
const formatPhone = (phone) => {
  if (!phone) return "未设置";
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
};

// 跳转到登录页
const goToLogin = () => {
  uni.navigateTo({
    url: "/pages/login/login",
  });
};

// 跳转到用药记录
const goToMedicationHistory = () => {
  if (!isLoggedIn.value) {
    uni.showToast({
      title: "请先登录",
      icon: "none",
    });
    return;
  }
  uni.navigateTo({
    url: "/pages/profile/medication-logs",
  });
};

// 跳转到积分记录
const goToPointsHistory = () => {
  if (!isLoggedIn.value) {
    uni.showToast({
      title: "请先登录",
      icon: "none",
    });
    return;
  }
  uni.navigateTo({
    url: "/pages/profile/points-logs",
  });
};

// 订阅微信通知
const subscribeNotification = async () => {
  if (!isLoggedIn.value) {
    uni.showToast({
      title: "请先登录",
      icon: "none",
    });
    return;
  }

  if (subscribing.value) {
    return;
  }

  subscribing.value = true;

  try {
    // 请求订阅消息权限
    const subscribeResult = await uni.requestSubscribeMessage({
      tmplIds: [SUBSCRIBE_TEMPLATE_ID],
    });

    if (subscribeResult[SUBSCRIBE_TEMPLATE_ID] === "accept") {
      // 用户同意订阅，调用后端API增加订阅次数
      const result = await patientUserAPI.addSubscriptionCount();
      
      if (result.code === 0) {
        // 更新本地用户信息
        userInfo.value.subscriptionCount = result.data.newCount;
        StorageUtil.setUserInfo(userInfo.value);
        
        uni.showToast({
          title: "订阅成功！",
          icon: "success",
        });
      } else {
        uni.showToast({
          title: result.message || "订阅失败",
          icon: "none",
        });
      }
    } else if (subscribeResult[SUBSCRIBE_TEMPLATE_ID] === "reject") {
      uni.showToast({
        title: "您拒绝了订阅，将不会为您进行用药提醒",
        icon: "none",
      });
    } else {
      uni.showToast({
        title: "订阅失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("订阅失败:", error);
    uni.showToast({
      title: "订阅失败，请重试",
      icon: "none",
    });
  } finally {
    subscribing.value = false;
  }
};

// 跳转到设置
const goToSettings = () => {
  uni.navigateTo({
    url: "/pages/settings/settings",
  });
};

// 跳转到帮助
const goToHelp = () => {
  uni.navigateTo({
    url: "/pages/help/help",
  });
};

// 跳转到关于
const goToAbout = () => {
  uni.navigateTo({
    url: "/pages/about/about",
  });
};

// 退出登录
const logout = () => {
  uni.showModal({
    title: "提示",
    content: "确定要退出登录吗？",
    success: (res) => {
      if (res.confirm) {
        // 清除用户数据
        StorageUtil.clearUserData();

        // 重置用户信息
        userInfo.value = {};

        uni.showToast({
          title: "已退出登录",
          icon: "success",
        });

        // 跳转到首页
        uni.reLaunch({
          url: "/pages/index/index",
        });
      }
    },
  });
};
</script>

<style lang="scss" scoped>
.profile-page {
  height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  box-sizing: border-box;
}

// 用户信息卡片
.user-card {
  padding: 40rpx;
  margin-bottom: 20rpx;
  background: linear-gradient(to top, #00c6fb 0%, #005bea 100%);
  border-radius: 16rpx;
  color: white;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.3);
}

.user-info {
  display: flex;
  align-items: center;
}

.avatar-section {
  margin-right: 30rpx;
}

.user-details {
  margin-left: 48rpx;
  flex: 1;
}

.user-name {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
  display: block;
}

.user-phone {
  font-size: 28rpx;
  opacity: 0.9;
  margin-bottom: 20rpx;
  display: block;
}

.user-stats {
  display: flex;
  gap: 30rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 5rpx;
}

.stat-label {
  font-size: 22rpx;
  opacity: 0.8;
}

.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
}

.login-text {
  font-size: 28rpx;
  margin: 20rpx 0;
  opacity: 0.9;
}

// 功能菜单
.menu-section {
}

.menu-group {
  background: white;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  transition: background-color 0.2s;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background-color: #f8f8f8;
}

.menu-left {
  display: flex;
  align-items: center;
}

.menu-text {
  font-size: 30rpx;
  color: #333;
  margin-left: 20rpx;
}

.menu-right {
  display: flex;
  align-items: center;
}

.subscription-count {
  font-size: 28rpx;
  font-weight: bold;
  margin-right: 10rpx;
}

.subscription-section {
  padding: 20rpx 24rpx;
  border-top: 1rpx solid #f0f0f0;
}

// 退出登录
.logout-section {
  padding: 40rpx 0;
  border-radius: 16rpx;
}

.logout-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 16rpx;
}
</style>
