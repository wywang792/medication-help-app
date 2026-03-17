<template>
  <scroll-view class="mall-page" scroll-y>
    <!-- 积分信息 -->
    <view class="points-header">
      <view class="points-card">
        <u-icon name="gift" size="40" color="#FFFFFF"></u-icon>
        <view class="points-info">
          <text class="points-label">我的积分</text>
          <text class="points-value">{{ userPoints }}</text>
        </view>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="products-section">
      <view class="section-title">
        <u-icon name="star" size="20" color="#4ECDC4"></u-icon>
        <text class="title-text">{{ currentCategory.name || "全部商品" }}</text>
      </view>

      <view v-if="products.length === 0" class="empty-state">
        <u-icon name="grid" size="60" color="#CCCCCC"></u-icon>
        <text class="empty-text">暂无商品</text>
      </view>

      <view v-else class="products-grid">
        <view
          v-for="product in products"
          :key="product._id"
          class="product-card"
        >
          <image
            :src="product.image"
            class="product-image"
            mode="aspectFit"
          ></image>
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-desc" v-if="product.description">{{
              product.description
            }}</text>
            <view class="product-price">
              <text class="points-required"
                >{{ product.points_required }} 积分</text
              >
              <u-button
                type="primary"
                size="mini"
                @click.stop="exchangeProduct(product)"
                :disabled="userPoints < product.points_required"
                :custom-style="{ width: '80rpx' }"
              >
                兑换
              </u-button>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 兑换记录 -->
    <view class="exchange-history">
      <view class="section-title">
        <u-icon name="clock" size="20" color="#FF9800"></u-icon>
        <text class="title-text">兑换记录</text>
      </view>
      <view v-if="exchangeHistory.length === 0" class="empty-state">
        <u-icon name="file-text" size="60" color="#CCCCCC"></u-icon>
        <text class="empty-text">暂无兑换记录</text>
      </view>
      <view v-else class="history-list">
        <view
          v-for="record in exchangeHistory"
          :key="record._id"
          class="history-item"
        >
          <view class="history-info">
            <text class="product-name">{{ record.product_name }}</text>
            <text class="exchange-time">{{
              formatDateTime(record.exchange_time)
            }}</text>
          </view>
          <view class="history-status" :class="getStatusClass(record.status)">
            {{ getStatusText(record.status) }}
          </view>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import StorageUtil from "../../utils/storage.js";
import { pointsAPI, productAPI } from "../../api/index.js";
import { formatDate, formatDateTime } from "../../utils/index.js";

const userPoints = ref(0);
const products = ref([]);
const exchangeHistory = ref([]);
const currentCategory = ref({});

onMounted(() => {
  loadUserPoints();
  loadProducts();
  loadExchangeHistory();
});

// 加载用户积分
const loadUserPoints = async () => {
  try {
    const userId = StorageUtil.getUserId();
    if (!userId) {
      // 未登录用户显示默认积分
      userPoints.value = 0;
      return;
    }

    // 调用云函数获取用户积分
    const result = await pointsAPI.getUserPoints();

    if (result.code === 0) {
      userPoints.value = result.data.total_points;
    } else {
      console.error("获取用户积分失败:", result.message);
      userPoints.value = 0;
    }
  } catch (error) {
    console.error("获取用户积分失败:", error);
    userPoints.value = 0;
  }
};

// 加载商品列表
const loadProducts = async () => {
  try {
    // 调用云函数获取商品列表
    const result = await productAPI.getProducts(currentCategory.value.id || 0);

    if (result.code === 0) {
      products.value = result.data.products;
    } else {
      console.error("获取商品列表失败:", result.message);
      products.value = [];
    }
  } catch (error) {
    console.error("获取商品列表失败:", error);
    products.value = [];
  }
};

// 加载兑换记录
const loadExchangeHistory = async () => {
  try {
    const userId = StorageUtil.getUserId();
    if (!userId) {
      exchangeHistory.value = [];
      return;
    }

    // 调用云函数获取兑换记录
    const result = await productAPI.getExchangeHistory();

    if (result.code === 0) {
      exchangeHistory.value = result.data.history;
    } else {
      console.error("获取兑换记录失败:", result.message);
      exchangeHistory.value = [];
    }
  } catch (error) {
    console.error("获取兑换记录失败:", error);
    exchangeHistory.value = [];
  }
};

// 兑换商品
const exchangeProduct = async (product) => {
  if (userPoints.value < product.points_required) {
    uni.showToast({
      title: "积分不足",
      icon: "none",
    });
    return;
  }

  uni.showModal({
    title: "确认兑换",
    content: `确定要使用 ${product.points_required} 积分兑换 ${product.name} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const userId = StorageUtil.getUserId();
          if (!userId) {
            uni.showToast({
              title: "请先登录",
              icon: "none",
            });
            return;
          }

          // 调用云函数进行兑换
          const result = await productAPI.exchangeProduct(product._id);

          if (result.code === 0) {
            uni.showToast({
              title: "兑换成功",
              icon: "success",
            });
            // 重新加载数据
            await loadUserPoints();
            await loadExchangeHistory();
          } else {
            uni.showToast({
              title: result.message || "兑换失败",
              icon: "none",
            });
          }
        } catch (error) {
          console.error("兑换失败:", error);
          uni.showToast({
            title: "兑换失败",
            icon: "none",
          });
        }
      }
    },
  });
};

// 获取状态样式类
const getStatusClass = (status) => {
  switch (status) {
    case "completed":
      return "status-completed";
    case "processing":
      return "status-processing";
    case "cancelled":
      return "status-cancelled";
    default:
      return "status-processing";
  }
};

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case "completed":
      return "已完成";
    case "processing":
      return "处理中";
    case "cancelled":
      return "已取消";
    default:
      return "处理中";
  }
};
</script>

<style lang="scss" scoped>
.mall-page {
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

// 积分信息
.points-header {
  margin-bottom: 30rpx;
}

.points-card {
  background: linear-gradient(to top, #00c6fb 0%, #005bea 100%);
  border-radius: 16rpx;
  padding: 40rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.3);
}

.points-info {
  display: flex;
  flex-direction: column;
}

.points-label {
  font-size: 26rpx;
  opacity: 0.9;
  margin-bottom: 10rpx;
}

.points-value {
  font-size: 48rpx;
  font-weight: bold;
}

// 商品列表
.products-section {
  margin-bottom: 30rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.product-card {
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.product-image {
  width: 100%;
  height: 200rpx;
}

.product-info {
  padding: 20rpx;
}

.product-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.product-desc {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 16rpx;
  display: block;
  line-height: 1.4;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.product-price {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.points-required {
  flex: 1;
  font-size: 26rpx;
  color: #ff6b6b;
  font-weight: bold;
}

// 兑换记录
.exchange-history {
  margin-bottom: 30rpx;
}

.history-list {
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.history-item:last-child {
  border-bottom: none;
}

.history-info {
  display: flex;
  flex-direction: column;
}

.history-info .product-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.exchange-time {
  font-size: 24rpx;
  color: #666;
}

.history-status {
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;

  &.status-completed {
    background: #e8f5e8;
    color: #4caf50;
  }

  &.status-processing {
    background: #fff3e0;
    color: #ff9800;
  }

  &.status-cancelled {
    background: #ffebee;
    color: #f44336;
  }
}
</style>
