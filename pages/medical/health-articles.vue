<template>
  <view class="knowledge-base-container">
    <scroll-view class="article-list" scroll-y>
      <view v-if="loading" class="loading-state">
        <u-loading-icon mode="spinner" size="40"></u-loading-icon>
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="articles.length === 0" class="empty-state">
        <u-icon name="account-fill" size="80" color="#CCCCCC"></u-icon>
        <text class="empty-text">暂无科普文章</text>
      </view>

      <view v-else class="article-list">
        <view class="article-items">
          <view
            v-for="(article, index) in articles"
            :key="article._id"
            class="article-card"
          >
            <!-- 文章信息区域（可点击预览） -->
            <view class="article-info" @click="previewArticle(article)">
              <view class="article-title">{{ article.title }}</view>
              <view class="article-desc" v-if="article.description">
                {{ article.description }}
              </view>
              <view class="article-meta">
                <text class="meta-text">{{
                  formatDate(article.create_date)
                }}</text>
                <text class="meta-text" v-if="article.paragraphs">
                  {{ article.paragraphs.length }}个段落
                </text>
                <text class="preview-hint">点击预览</text>
              </view>
            </view>

            <!-- 操作按钮 -->
            <view class="article-actions">
              <u-button
                :type="article.status === 'published' ? 'success' : 'primary'"
                size="small"
                :loading="updatingStatus[article._id]"
                @click.stop="toggleArticleStatus(article)"
              >
                {{ article.status === "published" ? "已启用" : "启用" }}
              </u-button>
              <u-button
                type="default"
                size="small"
                @click.stop="editArticle(article)"
              >
                编辑
              </u-button>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 添加按钮 -->
    <view class="bottom-actions">
      <u-button type="primary" @click="addArticle">
        <u-icon name="plus" size="16" color="#FFFFFF"></u-icon>
        <text style="margin-left: 16rpx">添加科普文章</text>
      </u-button>
    </view>
  </view>
</template>

<script setup>
import { onShow } from "@dcloudio/uni-app";
import { ref } from "vue";
import { contentAPI } from "../../api/index.js";
import { formatDate } from "../../utils/index.js";

// 响应式数据
const articles = ref([]);
const loading = ref(false);
const updatingStatus = ref({});

// 页面显示时加载数据
onShow(() => {
  loadArticles();
});

// 预览文章
const previewArticle = (article) => {
  uni.navigateTo({
    url: `/pages/article/detail?id=${article._id}`,
  });
};

// 加载文章列表
const loadArticles = async () => {
  loading.value = true;
  try {
    const result = await contentAPI.getHealthArticles();
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

// 切换文章状态
const toggleArticleStatus = async (article) => {
  if (updatingStatus.value[article._id]) return;

  updatingStatus.value[article._id] = true;
  try {
    const result = await contentAPI.updateArticleStatus(article._id, {
      status: article.status === "published" ? "draft" : "published",
    });

    if (result.code === 0) {
      // 更新本地状态
      article.status = article.status === "published" ? "draft" : "published";
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
    url: `/pages/medical/health-articles-edit?id=${article._id}`,
  });
};

// 添加文章
const addArticle = () => {
  uni.navigateTo({
    url: "/pages/medical/health-articles-edit",
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
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 10rpx;
  border-radius: 8rpx;

  &:active {
    background: #f8f9fa;
    transform: scale(0.98);
  }
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

.preview-hint {
  font-size: 22rpx;
  color: #007aff;
  font-weight: 500;
}

.article-actions {
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
