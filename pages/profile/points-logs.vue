<template>
  <view class="points-logs-container">
 
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <u-loading-icon mode="spinner" size="40"></u-loading-icon>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 积分记录列表 -->
    <view v-else class="logs-content">
      <view v-if="logs.length === 0" class="empty-state">
        <u-icon name="info-circle" size="80" color="#CCCCCC"></u-icon>
        <text class="empty-text">暂无积分记录</text>
      </view>

      <view v-else class="logs-list">
        <view v-for="(log, index) in logs" :key="log._id" class="log-item">
          <view class="log-header">
            <view class="log-date">
              <text class="date">{{ log.formatted_date }} {{ log.formatted_time }}</text>
              <text class="time"></text>
            </view>
            <view class="log-points" :class="getPointsClass(log.points_change)">
              <text class="points-text">
                {{ log.points_change > 0 ? "+" : ""
                }}{{ log.points_change }}积分
              </text>
            </view>
          </view>

          <view class="log-content">
            <view class="log-description">
              <text class="description-text">{{ log.description }}</text>
            </view>
            <view class="log-balance">
              <text class="balance-label">余额：</text>
              <text class="balance-value">{{ log.balance_after }}积分</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 分页加载更多 -->
      <view v-if="hasMore" class="load-more">
        <u-button
          type="primary"
          size="small"
          :loading="loadingMore"
          @click="loadMore"
        >
          {{ loadingMore ? "加载中..." : "加载更多" }}
        </u-button>
      </view>

      <!-- 没有更多数据 -->
      <view v-else-if="logs.length > 0" class="no-more">
        <text class="no-more-text">没有更多数据了</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ref } from "vue";
import { patientUserAPI } from "../../api/index.js";

// 响应式数据
const loading = ref(false);
const loadingMore = ref(false);
const logs = ref([]);
const currentPage = ref(1);
const pageSize = ref(20);
const hasMore = ref(true);
const totalPages = ref(0);

// 页面加载
onLoad(() => {
  loadLogs();
});

// 页面显示时刷新数据
onShow(() => {
  // 如果从其他页面返回，可能需要刷新数据
  if (logs.value.length === 0) {
    loadLogs();
  }
});

// 加载积分记录
const loadLogs = async (isLoadMore = false) => {
  if (isLoadMore) {
    loadingMore.value = true;
  } else {
    loading.value = true;
    currentPage.value = 1;
    logs.value = [];
  }

  try {
    const result = await patientUserAPI.getPatientPointsLogs(
      currentPage.value,
      pageSize.value
    );

    if (result.code === 0) {
      if (isLoadMore) {
        logs.value.push(...result.data.logs);
      } else {
        logs.value = result.data.logs;
      }

      totalPages.value = result.data.total_pages;
      hasMore.value = currentPage.value < totalPages.value;

      console.log("积分记录加载成功:", result.data);
    } else {
      uni.showToast({
        title: result.message || "加载积分记录失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("加载积分记录失败:", error);
    uni.showToast({
      title: "加载积分记录失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

// 加载更多
const loadMore = () => {
  if (hasMore.value && !loadingMore.value) {
    currentPage.value++;
    loadLogs(true);
  }
};

// 获取积分样式类
const getPointsClass = (pointsChange) => {
  return pointsChange > 0 ? "points-earn" : "points-spend";
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};
</script>

<style scoped>
.points-logs-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-text,
.empty-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #999;
}

.logs-content {
  padding: 30rpx;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.log-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.log-date {
  display: flex;
  flex-direction: column;
}

.date {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 4rpx;
}

.log-points {
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
}

.points-earn {
  background: #e8f5e8;
}

.points-spend {
  background: #fff2f0;
}

.points-text {
  font-size: 24rpx;
  font-weight: bold;
}

.points-earn .points-text {
  color: #52c41a;
}

.points-spend .points-text {
  color: #ff4d4f;
}

.log-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.log-description {
  margin-bottom: 8rpx;
}

.description-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
}

.log-balance {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.balance-label {
  font-size: 24rpx;
  color: #666;
}

.balance-value {
  font-size: 24rpx;
  color: #333;
  font-weight: bold;
}

.load-more,
.no-more {
  display: flex;
  justify-content: center;
  padding: 40rpx 0;
}

.no-more-text {
  font-size: 24rpx;
  color: #999;
}
</style>
