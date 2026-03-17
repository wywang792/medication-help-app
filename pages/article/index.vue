<template>
  <view class="knowledge-base-container">
    <scroll-view class="article-list" scroll-y>
      <view v-if="loading" class="loading-state">
        <u-loading-icon mode="spinner" size="40"></u-loading-icon>
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="articles.length === 0" class="empty-state">
        <u-icon name="account-fill" size="80" color="#CCCCCC"></u-icon>
        <text class="empty-text">暂无内容</text>
      </view>

      <view v-else class="article-items">
        <view
          v-for="(article, index) in articles"
          :key="article._id"
          class="article-card"
          @click="viewArticle(article)"
        >
          <!-- 文章信息 -->
          <view class="article-info">
            <view class="article-title">{{ article.title }}</view>
            <view class="article-desc" v-if="article.description">
              {{ article.description }}
            </view>
            <view class="article-meta">
              <text class="meta-text">{{
                formatDate(article.create_date)
              }}</text>
            </view>
          </view>

          <!-- 右箭头 -->
          <u-icon name="arrow-right" size="24" color="#CCCCCC"></u-icon>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { contentAPI } from "../../api/index.js";
import { formatDate } from "../../utils/index.js";

// 响应式数据
const articles = ref([]);
const loading = ref(false);
const updatingStatus = ref({});

// 页面加载
onMounted(() => {
  loadArticles();
});

// 加载文章列表
const loadArticles = async () => {
  loading.value = true;
  try {
    const result = await contentAPI.getPublicContent();
    if (result.code === 0) {
      articles.value = result.data.articles || [];
    } else {
      uni.showToast({
        title: result.message || "加载文章列表失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("加载文章列表失败:", error);
    uni.showToast({
      title: "加载文章列表失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

// 查看文章详情
const viewArticle = (article) => {
  uni.navigateTo({
    url: `/pages/article/detail?id=${article._id}`,
  });
};

// 切换文章状态
const toggleArticleStatus = async (article) => {
  if (updatingStatus.value[article._id]) return;

  updatingStatus.value[article._id] = true;
  try {
    const result = await contentAPI.updateArticleStatus(article._id, {
      status: article.status === "enabled" ? "disabled" : "enabled",
    });

    if (result.code === 0) {
      // 更新本地状态
      article.status = article.status === "enabled" ? "disabled" : "enabled";

      // 如果启用了当前文章，禁用其他文章
      if (article.status === "enabled") {
        articles.value.forEach((a) => {
          if (a._id !== article._id && a.status === "enabled") {
            a.status = "disabled";
          }
        });
      }

      uni.showToast({
        title: article.status === "enabled" ? "已启用" : "已禁用",
        icon: "success",
      });
    } else {
      uni.showToast({
        title: result.message || "操作失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("更新文章状态失败:", error);
    uni.showToast({
      title: "操作失败",
      icon: "none",
    });
  } finally {
    updatingStatus.value[article._id] = false;
  }
};

// 编辑文章
const editArticle = (article) => {
  uni.navigateTo({
    url: `/pages/medical/article-edit?id=${article._id}`,
  });
};

// 添加文章
const addArticle = () => {
  uni.navigateTo({
    url: "/pages/medical/article-edit",
  });
};
</script>

<style scoped lang="scss">
.knowledge-base-container {
  height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
  box-sizing: border-box;
}

.article-list {
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

.article-list-container {
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.article-items {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.article-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;

  &:active {
    background: #f8f9fa;
    transform: scale(0.98);
    box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.15);
  }
}

.status-enabled {
  background: #52c41a;
}

.status-disabled {
  background: #999;
}

.article-info {
  flex: 1;
  min-width: 0;
}

.article-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-desc {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-meta {
  display: flex;
  gap: 20rpx;
}

.meta-text {
  font-size: 24rpx;
  color: #999;
}
</style>
