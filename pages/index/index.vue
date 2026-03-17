<template>
  <scroll-view class="content" scroll-y>
    <!-- 科普视频区域 -->
    <view class="video-section" v-if="videoData && !auditStatus">
      <view class="section-title">
        <u-icon name="play-circle" size="20" color="#007AFF"></u-icon>
        <text class="title-text">健康小课堂</text>
      </view>
      <view class="video-card">
        <video
          :src="videoData.video_url"
          :poster="videoData.cover_image"
          class="video-player"
          controls
          show-center-play-btn
          show-play-btn
          show-fullscreen-btn
					@error="videoErrorCallback"
        ></video>
        <view class="video-info">
          <text class="video-title">{{ videoData.title }}</text>
          <text class="video-subtitle" v-if="videoData.description">{{
            videoData.description
          }}</text>
        </view>
      </view>
    </view>

    <!-- 快捷功能入口 -->
    <view class="quick-actions-section">
      <view class="section-title">
        <u-icon name="grid" size="20" color="#4ECDC4"></u-icon>
        <text class="title-text">快捷功能</text>
      </view>
      <view class="quick-actions-grid">
        <view class="action-card" @click="goToMedicationLogs">
          <u-icon name="list" size="32" color="#007AFF"></u-icon>
          <text class="action-text">用药记录</text>
        </view>
        <view class="action-card" @click="goToKnowledge" v-if="!auditStatus">
          <u-icon name="file-text" size="32" color="#4ECDC4"></u-icon>
          <text class="action-text">知识库</text>
        </view>
        <view class="action-card" @click="goToMall">
          <u-icon name="gift" size="32" color="#FF9500"></u-icon>
          <text class="action-text">积分商城</text>
        </view>
        <view class="action-card" @click="goToProfile">
          <u-icon name="account" size="32" color="#FF6B6B"></u-icon>
          <text class="action-text">个人中心</text>
        </view>
      </view>
    </view>

    <!-- 未登录提示 -->
    <view v-if="!isLoggedIn" class="login-prompt">
      <view class="prompt-card">
        <text class="prompt-title">请先登录</text>
        <text class="prompt-desc">登录后可以查看您的用药提醒</text>
        <u-button type="primary" @click="goToLogin"> 去登录 </u-button>
      </view>
    </view>

    <!-- 用药提醒区域 -->
    <view v-else class="medication-section">
      <view class="section-title">
        <u-icon name="calendar" size="20" color="#FF6B6B"></u-icon>
        <text class="title-text">今日用药</text>
      </view>

      <view v-if="reminders.length === 0" class="empty-state">
        <u-icon name="info-circle" size="60" color="#CCCCCC"></u-icon>
        <text class="empty-text">今日暂无用药提醒</text>
      </view>

      <view v-else class="medication-list">
        <view
          v-for="(reminder, index) in reminders"
          :key="reminder._id"
          class="medication-card"
          :class="getCardClass(reminder)"
        >
          <view class="card-header">
            <view class="time-info">
              <text class="medication-time">{{ reminder.formattedTime }}</text>
              <text class="time-diff" :class="getTimeDiffClass(reminder)">{{
                reminder.timeText
              }}</text>
            </view>
            <view class="status-badge" :class="getStatusClass(reminder.status)">
              {{ getStatusText(reminder.status) }}
            </view>
          </view>

          <view class="card-content">
            <view class="medication-info">
              <view class="medication-summary">
                <view
                  v-for="(medication, medIndex) in reminder.medications"
                  :key="medication._id"
                  class="medication-item"
                >
                  <text class="medication-name">
                    {{ medication.medication_name }}
                  </text>
                  <text class="medication-dosage">
                    × {{ medication.dosage_amount }}{{ medication.dosage_unit }}
                  </text>
                </view>
              </view>
            </view>

            <view class="card-actions">
              <u-button
                v-if="reminder.status === 'pending'"
                type="primary"
                size="small"
                @click="confirmMedications(reminder)"
                :loading="confirmingId === reminder._id"
              >
                确认用药
              </u-button>
              <u-button
                v-else-if="reminder.status === 'taken'"
                type="success"
                size="small"
                disabled
              >
                已确认
              </u-button>
              <u-button
                v-else-if="reminder.status === 'missed'"
                type="error"
                size="small"
                disabled
              >
                已错过
              </u-button>
            </view>
          </view>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import StorageUtil from "../../utils/storage.js";
import { reminderAPI, contentAPI } from "../../api/index.js";

const videoData = ref(null);
const articles = ref([]);
const reminders = ref([]);

const confirmingId = ref(null);
const loading = ref(false);

// 审核状态控制
const auditStatus = ref(false);

// 计算属性：是否已登录
const isLoggedIn = computed(() => {
  return StorageUtil.isLoggedIn();
});

onMounted(() => {
  loadData();
});

// 页面显示时从本地存储读取审核状态
onShow(() => {
  const savedAuditStatus = StorageUtil.getData("auditStatus");
  if (savedAuditStatus !== null && savedAuditStatus !== undefined) {
    auditStatus.value = savedAuditStatus;
  }
});

// 下拉刷新
onPullDownRefresh(() => {
  console.log("下拉刷新");
  loadData().then(() => {
    uni.stopPullDownRefresh();
  });
});

// 加载数据
const loadData = async () => {
  console.log("加载数据");
  if (loading.value) return;

  loading.value = true;
  try {
    // 并行加载科普内容和用药提醒
    await Promise.allSettled([loadPublicContent(), loadMedicationReminders()]);
  } catch (error) {
    console.error("加载数据失败:", error);
    uni.showToast({
      title: "加载数据失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

// 加载科普内容
const loadPublicContent = async () => {
  try {
    console.log("开始加载科普内容");
    const result = await contentAPI.getPublicContent();

    if (result.code === 0) {
      videoData.value = result.data.video;
      articles.value = result.data.articles;
      console.log("科普内容加载成功", {
        video: videoData.value,
        articles: articles.value,
      });
    } else {
      console.error("科普内容加载失败:", result.message);
      // 科普内容加载失败不影响其他功能，只记录错误
    }
  } catch (error) {
    console.error("加载科普内容失败:", error);
    // 科普内容加载失败不影响其他功能，只记录错误
  }
};

// 加载用药提醒
const loadMedicationReminders = async () => {
  // 如果未登录，不加载用药提醒
  if (!isLoggedIn.value) {
    console.log("用户未登录，跳过用药提醒加载");
    return;
  }

  try {
    console.log("开始加载用药提醒");
    const result = await reminderAPI.getTodayReminders();

    if (result.code === 0) {
      reminders.value = result.data.reminders;
      console.log("用药提醒加载成功", reminders.value);
    } else {
      console.error("用药提醒加载失败:", result.message);
      uni.showToast({
        title: result.message || "加载用药提醒失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("加载用药提醒失败:", error);
    uni.showToast({
      title: "加载用药提醒失败",
      icon: "none",
    });
  }
};

// 确认用药
const confirmMedications = async (reminder) => {
  confirmingId.value = reminder._id;
  try {
    // 确认该时间点的用药
    const result = await reminderAPI.confirmMedication(reminder._id);

    if (result.code === 0) {
      const pointsEarned = result.data?.points_earned || 0;
      const message =
        pointsEarned > 0
          ? `确认用药成功，获得${pointsEarned}积分！`
          : "确认用药成功";

      uni.showToast({
        title: message,
        icon: "none",
      });
      await loadMedicationReminders();
    } else {
      uni.showToast({
        title: result.message || "确认用药失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("确认用药失败:", error);
    uni.showToast({
      title: "确认用药失败",
      icon: "none",
    });
  } finally {
    confirmingId.value = null;
  }
};

// 查看文章
const viewArticle = (article) => {
  // 跳转到文章详情页
  uni.navigateTo({
    url: `/pages/article/detail?id=${article._id}`,
  });
};

// 跳转到登录页
const goToLogin = () => {
  uni.navigateTo({
    url: "/pages/login/login",
  });
};

// 跳转到用药记录
const goToMedicationLogs = () => {
	if(!isLoggedIn.value) {
		uni.showToast({
			title: "请先登录",
			icon: "none"
		})
		return
	}
  uni.navigateTo({
    url: "/pages/profile/medication-logs",
  });
};

// 跳转到知识库
const goToKnowledge = () => {
  uni.navigateTo({
    url: "/pages/article/index",
  });
};

// 跳转到积分商城
const goToMall = () => {
  uni.navigateTo({
    url: "/pages/mall/mall",
  });
};

// 跳转到个人中心
const goToProfile = () => {
  uni.navigateTo({
    url: "/pages/profile/profile",
  });
};

// 获取卡片样式类
const getCardClass = (reminder) => {
  if (reminder.status === "taken") return "card-taken";
  if (reminder.status === "missed") return "card-missed";
  if (reminder.timeStatus === "overdue") return "card-overdue";
  return "card-pending";
};

// 获取时间差样式类
const getTimeDiffClass = (reminder) => {
  if (reminder.timeStatus === "overdue") return "time-overdue";
  if (reminder.timeStatus === "upcoming") return "time-upcoming";
  return "time-completed";
};

// 获取状态样式类
const getStatusClass = (status) => {
  switch (status) {
    case "pending":
      return "status-pending";
    case "taken":
      return "status-taken";
    case "missed":
      return "status-missed";
    default:
      return "status-pending";
  }
};

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case "pending":
      return "待用药";
    case "taken":
      return "已用药";
    case "missed":
      return "未用药";
    default:
      return "待用药";
  }
};

// 视频播放报错
const videoErrorCallback = (error) => {
	console.error(error)
	uni.showToast({
		title: JSON.stringify(error),
		icon: "none"
	})
};
</script>

<style lang="scss" scoped>
.content {
  height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  box-sizing: border-box;
}

.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;

  .title-text {
    margin-left: 10rpx;
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }
}

// 登录提示
.login-prompt {
  margin: 40rpx 0;
}

.prompt-card {
  background: white;
  border-radius: 16rpx;
  padding: 60rpx 40rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.prompt-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin: 20rpx 0 10rpx;
  display: block;
}

.prompt-desc {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 30rpx;
  display: block;
}

// 视频区域
.video-section {
  margin-bottom: 30rpx;
}

// 快捷功能区域
.quick-actions-section {
  margin-bottom: 30rpx;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 30rpx 20rpx;
  background: white;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:active {
    background-color: #f8f9fa;
    transform: scale(0.98);
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
  }
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-text {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  text-align: center;
}

.video-card {
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.video-player {
  width: 100%;
  height: 400rpx;
}

.video-info {
  padding: 20rpx;
}

.video-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.video-subtitle {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
  display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.video-desc {
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
}

// 用药提醒区域
.medication-section {
  margin-bottom: 30rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20rpx;
  background: white;
  border-radius: 16rpx;
  padding: 80rpx 40rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-top: 20rpx;
  display: block;
}

.medication-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.medication-card {
  background: white;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  border-left: 8rpx solid #007aff;

  &.card-taken {
    border-left-color: #4caf50;
    opacity: 0.8;
  }

  &.card-missed {
    border-left-color: #ff5722;
    opacity: 0.6;
  }

  &.card-overdue {
    border-left-color: #ff9800;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.time-info {
  display: flex;
  flex-direction: column;
}

.medication-time {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.time-diff {
  font-size: 24rpx;
  margin-top: 4rpx;

  &.time-upcoming {
    color: #007aff;
  }

  &.time-overdue {
    color: #ff5722;
  }

  &.time-completed {
    color: #4caf50;
  }
}

.status-badge {
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;

  &.status-pending {
    background: #e3f2fd;
    color: #1976d2;
  }

  &.status-taken {
    background: #e8f5e8;
    color: #4caf50;
  }

  &.status-missed {
    background: #ffebee;
    color: #f44336;
  }
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.medication-info {
  display: flex;
  flex-direction: column;
}

.medication-summary {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.medication-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
}

.medication-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.medication-dosage {
  font-size: 26rpx;
  color: #666;
  margin-left: 8rpx;
}

.card-actions {
  display: flex;
  align-items: center;
}

// 刷新按钮
.refresh-btn {
  position: fixed;
  bottom: 140rpx; /* 调整位置，避免被tabbar遮挡 */
  right: 40rpx;
  width: 80rpx;
  height: 80rpx;
  background: #007aff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.3);
  z-index: 999;
}
</style>
