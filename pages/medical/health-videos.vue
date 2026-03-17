<template>
  <view class="health-classroom-container">
		<scroll-view class="video-list" scroll-y>
			
			<view v-if="loading" class="loading-state">
			  <u-loading-icon mode="spinner" size="40"></u-loading-icon>
			  <text class="loading-text">加载中...</text>
			</view>
			
			<view v-else-if="videos.length === 0" class="empty-state">
			  <u-icon name="account-fill" size="80" color="#CCCCCC"></u-icon>
			  <text class="empty-text">暂无视频数据</text>
			</view>
			
			<view v-else class="video-items">
				<view
					v-for="(video, index) in videos"
					:key="video._id"
					class="video-card"
				>
					<!-- 视频封面 -->
					<view class="video-cover">
						<image
							:src="video.cover_image || '/static/logo.png'"
							class="cover-image"
							mode="aspectFit"
						></image>
					</view>
						
					<!-- 视频信息 -->
					<view class="video-info">
						<view class="video-title">{{ video.title }}</view>
						<view class="video-subtitle" v-if="video.description">
							{{ video.description }}
						</view>
					</view>
						
					<!-- 操作按钮 -->
					<view class="video-actions">
						<u-button
							:type="video.status === 'enabled' ? 'success' : 'primary'"
							size="small"
							:loading="updatingStatus[video._id]"
							@click="toggleVideoStatus(video)"
						>
							{{ video.status === "enabled" ? "已启用" : "启用" }}
						</u-button>
						<u-button type="default" size="small" @click="editVideo(video)">
							编辑
						</u-button>
					</view>
				</view>
			</view>
		</scroll-view>
   
    <!-- 添加按钮 -->
		<view class="bottom-actions">
		  <u-button type="primary" @click="addVideo">
		    <u-icon name="plus" size="16" color="#FFFFFF"></u-icon>
		    <text style="margin-left: 16rpx">添加科普视频</text>
		  </u-button>
		</view>
  </view>
</template>

<script setup>
import { onShow } from "@dcloudio/uni-app";	
import { ref } from "vue";
import { contentAPI } from "../../api/index.js";

// 响应式数据
const videos = ref([]);
const loading = ref(false);
const updatingStatus = ref({});

// 页面加载
onShow(() => {
  loadVideos();
});

// 加载视频列表
const loadVideos = async () => {
  loading.value = true;
  try {
    const result = await contentAPI.getHealthVideos();
    if (result.code === 0) {
      videos.value = result.data.videos || [];
    } else {
      uni.showToast({
        title: result.message || "加载视频列表失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("加载视频列表失败:", error);
    uni.showToast({
      title: "加载视频列表失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

// 切换视频状态
const toggleVideoStatus = async (video) => {
  if (updatingStatus.value[video._id]) return;

  updatingStatus.value[video._id] = true;
  try {
    const result = await contentAPI.updateVideoStatus(video._id, {
      status: video.status === "enabled" ? "disabled" : "enabled",
    });

    if (result.code === 0) {
      // 更新本地状态
      video.status = video.status === "enabled" ? "disabled" : "enabled";

      // 如果启用了当前视频，禁用其他视频
      if (video.status === "enabled") {
        videos.value.forEach((v) => {
          if (v._id !== video._id && v.status === "enabled") {
            v.status = "disabled";
          }
        });
      }

      uni.showToast({
        title: video.status === "enabled" ? "已启用" : "已禁用",
        icon: "success",
      });
    } else {
      uni.showToast({
        title: result.message || "操作失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("更新视频状态失败:", error);
    uni.showToast({
      title: "操作失败",
      icon: "none",
    });
  } finally {
    updatingStatus.value[video._id] = false;
  }
};

// 编辑视频
const editVideo = (video) => {
  uni.navigateTo({
    url: `/pages/medical/health-videos-edit?id=${video._id}`,
  });
};

// 添加视频
const addVideo = () => {
  uni.navigateTo({
    url: "/pages/medical/health-videos-edit",
  });
};
</script>

<style scoped>
.health-classroom-container {
  height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
  box-sizing: border-box;
}

.video-list {
	height: calc(100vh - 40rpx - 94rpx - 40px);
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

.video-items {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.video-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
	gap: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.video-cover {
  position: relative;
  width: 160rpx;
  height: 120rpx;
  border-radius: 8rpx;
  overflow: hidden;
  flex-shrink: 0;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.video-info {
  flex: 1;
	height: 120rpx;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	overflow: hidden;
}

.video-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-subtitle {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-actions {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  flex-shrink: 0;
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  padding: 30rpx 30rpx 64rpx;
  border-top: 1rpx solid #e5e5e5;
  z-index: 100;
}
</style>
