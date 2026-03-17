<template>
  <view class="article-detail-container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <u-loading-icon mode="spinner" size="40"></u-loading-icon>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 文章内容 -->
    <view v-else-if="article" class="article-content">
      <!-- 文章标题 -->
      <view class="article-header">
        <view class="article-title">{{ article.title }}</view>
        <view class="article-meta">
          <text class="meta-text">{{ formatDate(article.create_date) }}</text>
        </view>
      </view>

      <!-- 文章封面 -->
      <!-- <view v-if="article.cover_image" class="article-cover">
        <image
          :src="article.cover_image"
          class="cover-image"
          mode="aspectFit"
        ></image>
      </view> -->

      <!-- 文章段落内容 -->
      <view class="article-body">
        <view
          v-for="(paragraph, index) in article.paragraphs"
          :key="index"
          class="paragraph-item"
        >
          <!-- 图片段落 -->
          <view v-if="paragraph.type === 'image'" class="image-paragraph">
            <image
              :src="paragraph.image_url"
              class="content-image"
              mode="widthFix"
              @click="previewImage(paragraph.image_url)"
            ></image>
          </view>

          <!-- 文本段落 -->
          <view v-else class="text-paragraph">
            <text v-if="paragraph.title" class="paragraph-title">
              {{ paragraph.title }}
            </text>
            <text v-if="paragraph.content" class="paragraph-content">
              {{ paragraph.content }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else class="error-state">
      <u-icon name="info-circle" size="60" color="#CCCCCC"></u-icon>
      <text class="error-text">文章不存在或已被删除</text>
      <u-button type="primary" @click="goBack">返回</u-button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { formatDate } from "../../utils/index.js";

// 响应式数据
const articleId = ref("");
const article = ref(null);
const loading = ref(true);

// 页面加载
onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const query = currentPage.options;

  if (query.id) {
    articleId.value = query.id;
    loadArticle();
  } else {
    loading.value = false;
    uni.showToast({
      title: "文章ID不能为空",
      icon: "none",
    });
  }
});

// 加载文章详情
const loadArticle = async () => {
  try {
    loading.value = true;

    const result = await uniCloud.callFunction({
      name: "getArticleDetail",
      data: {
        article_id: articleId.value,
      },
    });

    if (result.result.code === 0) {
      article.value = result.result.data.article;
    } else {
      uni.showToast({
        title: result.result.message || "加载失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("加载文章失败:", error);
    uni.showToast({
      title: "加载失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

// 预览图片
const previewImage = (imageUrl) => {
  uni.previewImage({
    urls: [imageUrl],
    current: imageUrl,
  });
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};
</script>

<style lang="scss" scoped>
.article-detail-container {
  min-height: 100vh;
  background: #ffffff;
  padding: 0;
}

// 加载状态
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 20rpx;

  .loading-text {
    font-size: 28rpx;
    color: #666;
  }
}

// 错误状态
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 30rpx;
  padding: 40rpx;

  .error-text {
    font-size: 28rpx;
    color: #999;
    text-align: center;
  }
}

// 文章内容
.article-content {
  padding: 40rpx 30rpx;
}

// 文章头部
.article-header {
  margin-bottom: 40rpx;

  .article-title {
    text-align: center;
    display: block;
    font-size: 48rpx;
    font-weight: bold;
    color: #333;
    line-height: 1.4;
    margin-bottom: 20rpx;
  }

  .article-meta {
    text-align: right;
    .meta-text {
      font-size: 24rpx;
      color: #999;
    }
  }
}

// 文章封面
.article-cover {
  margin-bottom: 40rpx;

  .cover-image {
    width: 100%;
    height: 400rpx;
    border-radius: 16rpx;
    object-fit: cover;
  }
}

// 文章主体
.article-body {
  .paragraph-item {
    margin-bottom: 40rpx;

    &:last-child {
      margin-bottom: 0;
    }
  }

  // 图片段落
  .image-paragraph {
    display: flex;
    justify-content: center;
    align-items: center;

    .content-image {
			width: 100%;
      border-radius: 12rpx;
    }
  }

  // 文本段落
  .text-paragraph {
    .paragraph-title {
      display: block;
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 20rpx;
      line-height: 1.4;
      text-indent: 2em;
    }

    .paragraph-content {
      display: block;
      font-size: 32rpx;
      color: #666;
      line-height: 1.8;
      text-align: justify;
      text-indent: 2em;
    }
  }
}
</style>
