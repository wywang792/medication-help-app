<template>
  <scroll-view class="medical-home-container" scroll-y>
    <!-- 统计卡片 -->
    <view class="stats-section">
      <view class="section-title">
        <u-icon name="order" size="20" color="#333"></u-icon>
        <text class="title-text">数据概览</text>
        <u-icon
          name="reload"
          size="20"
          color="#333"
          class="refresh"
          @click="refreshData"
        ></u-icon>
      </view>

      <view class="stat-grid">
        <view class="stat-card">
          <text class="stat-number">{{ stats.totalPatients }}</text>
          <text class="stat-label">总患者数</text>
        </view>

        <view class="stat-card">
          <text class="stat-number">{{ stats.activePatients }}</text>
          <text class="stat-label">活跃患者</text>
        </view>

        <view class="stat-card">
          <text class="stat-number">{{ stats.todayMedications }}</text>
          <text class="stat-label">今日用药</text>
        </view>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="quick-actions">
      <view class="section-title">
        <u-icon name="grid" size="20" color="#333"></u-icon>
        <text class="title-text">快捷操作</text>
      </view>

      <view class="action-grid">
        <view class="action-item" @click="goToPatientList">
          <view class="action-icon">
            <u-icon name="list" size="30" color="#007AFF"></u-icon>
          </view>
          <text class="action-text">患者管理</text>
        </view>
				
				<view class="action-item" @click="goToPatientIndex">
				  <view class="action-icon">
				    <u-icon name="account" size="30" color="#007AFF"></u-icon>
				  </view>
				  <text class="action-text">进入患者端</text>
				</view>

        <view
          class="action-item"
          @click="goToHealthClassroom"
          v-if="!auditStatus"
        >
          <view class="action-icon">
            <u-icon name="play-circle" size="30" color="#4ECDC4"></u-icon>
          </view>
          <text class="action-text">健康小课堂</text>
        </view>

        <view
          class="action-item"
          @click="goToKnowledgeBase"
          v-if="!auditStatus"
        >
          <view class="action-icon">
            <u-icon name="file-text" size="30" color="#FF9500"></u-icon>
          </view>
          <text class="action-text">知识库</text>
        </view>

        <view class="action-item" @click="logout">
          <view class="action-icon">
            <u-icon name="home" size="30" color="#FF6B6B"></u-icon>
          </view>
          <text class="action-text">退出登录</text>
        </view>
      </view>
    </view>

    <!-- 最近活动 -->
    <view class="recent-activities">
      <view class="section-title">
        <u-icon name="clock" size="20" color="#333"></u-icon>
        <text class="title-text">最近活动</text>
      </view>

      <view class="activity-list">
        <view v-if="loading" class="loading-indicator">
          <u-loading mode="circle" size="40"></u-loading>
        </view>
        <view v-else-if="activities.length === 0" class="empty-activities">
          <u-icon name="info-circle" size="60" color="#CCCCCC"></u-icon>
          <text class="empty-text">暂无最近活动</text>
        </view>

        <view v-else class="activity-items">
          <view
            v-for="(activity, index) in activities"
            :key="activity._id"
            class="activity-item"
          >
            <view class="activity-icon">
              <u-icon
                :name="getActivityIcon(activity.type)"
                size="20"
                :color="getActivityColor(activity.type)"
              ></u-icon>
            </view>
            <view class="activity-content">
              <text class="activity-text">
                {{ activity.patient_name }} 确认用药
              </text>
              <text class="activity-time">{{ activity.formatted_time }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { onShow } from "@dcloudio/uni-app";
import { ref } from "vue";
import { patientAPI } from "../../api/index.js";
import StorageUtil from "../../utils/storage.js";
import { formatRelativeTime } from "../../utils/index.js";

// 响应式数据
const stats = ref({
  totalPatients: 0,
  activePatients: 0,
  todayMedications: 0,
});

const activities = ref([]);
const loading = ref(false);

// 审核状态控制
const auditStatus = ref(false);

// 页面显示时从本地存储读取审核状态
onShow(() => {
  loadData();
  const savedAuditStatus = StorageUtil.getData("auditStatus");
  if (savedAuditStatus !== null && savedAuditStatus !== undefined) {
    auditStatus.value = savedAuditStatus;
  }
});

// 加载数据
const loadData = async () => {
  loading.value = true;
  try {
    await Promise.all([loadPatientStats(), loadRecentActivities()]);
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

// 加载患者统计数据
const loadPatientStats = async () => {
  try {
    const result = await patientAPI.getPatientList();
    if (result.code === 0) {
      const patients = result.data.patients || [];
      stats.value = {
        totalPatients: patients.length,
        activePatients: patients.filter((p) => p.status === "active").length,
        todayMedications: patients.reduce(
          (total, p) => total + (p.todayMedications || 0),
          0
        ),
      };
    }
  } catch (error) {
    console.error("加载患者统计失败:", error);
  }
};

// 加载最近活动
const loadRecentActivities = async () => {
  try {
    const result = await patientAPI.getRecentActivities();
    if (result.code === 0) {
      activities.value = result.data.activities || [];
    }
  } catch (error) {
    console.error("加载最近活动失败:", error);
  }
};

// 刷新数据
const refreshData = () => {
  loadData();
};

// 获取活动图标
const getActivityIcon = (type) => {
  switch (type) {
    case "medication_confirmed":
      return "checkmark-circle";
    default:
      return "info-circle";
  }
};

// 获取活动颜色
const getActivityColor = (type) => {
  switch (type) {
    case "medication_confirmed":
      return "#52c41a";
    default:
      return "#666";
  }
};

// 跳转到患者列表
const goToPatientList = () => {
  uni.navigateTo({
    url: "/pages/patient/list",
  });
};

// 跳转到患者端
const goToPatientIndex = () => {
  uni.navigateTo({
    url: "/pages/index/index",
  });
};

// 跳转到健康小课堂
const goToHealthClassroom = () => {
  uni.navigateTo({
    url: "/pages/medical/health-videos",
  });
};

// 跳转到知识库
const goToKnowledgeBase = () => {
  uni.navigateTo({
    url: "/pages/medical/health-articles",
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

<style scoped>
.medical-home-container {
  height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
  box-sizing: border-box;
}

.quick-actions,
.recent-activities {
  margin: 30rpx 0;
}

.stat-grid {
  display: flex;
  gap: 20rpx;
}

.stat-card {
  flex: 1;
  padding: 48rpx 0;
  background: #ffffff;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.stat-number {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: #666;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 20rpx;
}

.title-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.refresh {
  margin-left: auto;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.action-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.action-icon {
  margin-bottom: 20rpx;
}

.action-text {
  font-size: 28rpx;
  color: #333;
}

.activity-list {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.loading-indicator {
  display: flex;
  justify-content: center;
  padding: 40rpx 0;
}

.empty-activities {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
}

.empty-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #999;
}

.activity-items {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  margin-right: 20rpx;
}

.activity-content {
  flex: 1;
}

.activity-text {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
}

.activity-time {
  display: block;
  font-size: 24rpx;
  color: #999;
}
</style>
