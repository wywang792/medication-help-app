<template>
  <view class="product-verification-container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <u-loading-icon mode="spinner" size="40"></u-loading-icon>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 商品列表 -->
    <view v-else class="products-content">
      <view v-if="products.length === 0" class="empty-state">
        <u-icon name="gift" size="80" color="#CCCCCC"></u-icon>
        <text class="empty-text">该患者暂无商品兑换记录</text>
      </view>

      <view v-else class="products-list">
        <view
          v-for="product in products"
          :key="product._id"
          class="product-card"
          :class="getProductCardClass(product.status)"
        >
          <!-- 商品图片 -->
          <view class="product-image-section">
            <image
              v-if="product.product_image"
              :src="product.product_image"
              class="product-image"
              mode="aspectFit"
            ></image>
            <view v-else class="product-image-placeholder">
              <u-icon name="gift" size="40" color="#CCCCCC"></u-icon>
            </view>
          </view>

          <!-- 商品信息 -->
          <view class="product-info">
            <text class="product-name">{{ product.product_name }}</text>
            <text v-if="product.product_description" class="product-desc">
              {{ product.product_description }}
            </text>

            <view class="product-details">
              <view class="detail-item">
                <text class="detail-label">使用积分：</text>
                <text class="detail-value">{{ product.points_used }} 积分</text>
              </view>
              <view class="detail-item">
                <text class="detail-label">兑换时间：</text>
                <text class="detail-value">{{
                  formatDateTime(product.exchange_time)
                }}</text>
              </view>
              <view v-if="product.complete_time" class="detail-item">
                <text class="detail-label">完成时间：</text>
                <text class="detail-value">{{
                  formatDateTime(product.complete_time)
                }}</text>
              </view>
              <view v-if="product.notes" class="detail-item">
                <text class="detail-label">备注：</text>
                <text class="detail-value">{{ product.notes }}</text>
              </view>
            </view>

            <!-- 状态标签 -->
            <view class="status-section">
              <view
                class="status-badge"
                :class="getStatusClass(product.status)"
              >
                {{ getStatusText(product.status) }}
              </view>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="product-actions">
            <u-button
              v-if="product.status === 'processing'"
              type="success"
              size="small"
              @click="completeProduct(product)"
              :loading="completingId === product._id"
            >
              兑换
            </u-button>
            <u-button
              v-if="product.status === 'processing'"
              type="error"
              size="small"
              @click="cancelProduct(product)"
              :loading="cancellingId === product._id"
            >
              取消
            </u-button>
            <u-button
              v-if="product.status === 'completed'"
              type="info"
              size="small"
              disabled
            >
              已完成
            </u-button>
            <u-button
              v-if="product.status === 'cancelled'"
              type="default"
              size="small"
              disabled
            >
              已取消
            </u-button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { productAPI } from "../../api/index.js";
import { formatDateTime } from "../../utils/index.js";

// 响应式数据
const loading = ref(false);
const products = ref([]);
const patientId = ref("");
const patientName = ref("");
const completingId = ref("");
const cancellingId = ref("");

// 页面加载
onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const query = currentPage.options;

  if (query.patientId) {
    patientId.value = query.patientId;
    patientName.value = query.patientName || "患者";
    loadPatientProducts();
  }
});

// 加载患者商品记录
const loadPatientProducts = async () => {
  try {
    loading.value = true;

    const result = await productAPI.getPatientProducts(patientId.value);

    if (result.code === 0) {
      products.value = result.data.products;
    } else {
      uni.showToast({
        title: result.message || "加载商品记录失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("加载患者商品记录失败:", error);
    uni.showToast({
      title: "加载商品记录失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

// 完成兑换
const completeProduct = async (product) => {
  uni.showModal({
    title: "确认兑换",
    content: `确定要完成兑换商品"${product.product_name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          completingId.value = product._id;

          const result = await productAPI.updateExchangeStatus(
            product._id,
            "completed",
            "医护人员完成兑换"
          );

          if (result.code === 0) {
            uni.showToast({
              title: "兑换完成",
              icon: "success",
            });
            // 重新加载数据
            await loadPatientProducts();
          } else {
            uni.showToast({
              title: result.message || "操作失败",
              icon: "none",
            });
          }
        } catch (error) {
          console.error("完成兑换失败:", error);
          uni.showToast({
            title: "操作失败",
            icon: "none",
          });
        } finally {
          completingId.value = "";
        }
      }
    },
  });
};

// 取消兑换
const cancelProduct = async (product) => {
  uni.showModal({
    title: "确认取消",
    content: `确定要取消兑换商品"${product.product_name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          cancellingId.value = product._id;

          const result = await productAPI.updateExchangeStatus(
            product._id,
            "cancelled",
            "医护人员取消兑换"
          );

          if (result.code === 0) {
            uni.showToast({
              title: "已取消",
              icon: "success",
            });
            // 重新加载数据
            await loadPatientProducts();
          } else {
            uni.showToast({
              title: result.message || "操作失败",
              icon: "none",
            });
          }
        } catch (error) {
          console.error("取消兑换失败:", error);
          uni.showToast({
            title: "操作失败",
            icon: "none",
          });
        } finally {
          cancellingId.value = "";
        }
      }
    },
  });
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};

// 获取商品卡片样式类
const getProductCardClass = (status) => {
  switch (status) {
    case "completed":
      return "card-completed";
    case "cancelled":
      return "card-cancelled";
    default:
      return "card-processing";
  }
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
      return "待处理";
    case "cancelled":
      return "已取消";
    default:
      return "待处理";
  }
};
</script>

<style lang="scss" scoped>
.product-verification-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400rpx;

  .loading-text {
    margin-top: 20rpx;
    font-size: 28rpx;
    color: #999;
  }
}

.products-content {
  padding: 30rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;

  .empty-text {
    margin-top: 30rpx;
    font-size: 28rpx;
    color: #999;
  }
}

.products-list {
  .product-card {
    background: #ffffff;
    border-radius: 16rpx;
    margin-bottom: 30rpx;
    padding: 30rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: flex-start;
    gap: 30rpx;

    &.card-completed {
      border-left: 8rpx solid #4caf50;
    }

    &.card-cancelled {
      border-left: 8rpx solid #f44336;
    }

    &.card-processing {
      border-left: 8rpx solid #ff9800;
    }
  }

  .product-image-section {
    flex-shrink: 0;
    width: 120rpx;
    height: 120rpx;
    border-radius: 12rpx;
    overflow: hidden;
    background: #f8f9fa;
    display: flex;
    align-items: center;
    justify-content: center;

    .product-image {
      width: 100%;
      height: 100%;
    }

    .product-image-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
    }
  }

  .product-info {
    flex: 1;
    min-width: 0;

    .product-name {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 10rpx;
      display: block;
    }

    .product-desc {
      font-size: 26rpx;
      color: #666;
      margin-bottom: 20rpx;
      display: block;
      line-height: 1.4;
    }

    .product-details {
      margin-bottom: 20rpx;

      .detail-item {
        display: flex;
        margin-bottom: 8rpx;
        font-size: 24rpx;

        .detail-label {
          color: #999;
          min-width: 120rpx;
        }

        .detail-value {
          color: #666;
          flex: 1;
        }
      }
    }

    .status-section {
      margin-bottom: 20rpx;

      .status-badge {
        display: inline-block;
        padding: 8rpx 16rpx;
        border-radius: 20rpx;
        font-size: 24rpx;
        font-weight: bold;

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
    }
  }

  .product-actions {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 10rpx;
    min-width: 120rpx;
  }
}
</style>
