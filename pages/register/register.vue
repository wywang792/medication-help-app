<template>
  <view class="register-container">
    <view class="header">
      <text class="title">完善个人信息</text>
      <text class="subtitle">请填写您的基本信息</text>
    </view>

    <view class="form-section">
      <view class="input-group">
        <text class="label">昵称 <text class="required">*</text></text>
        <input
          class="input"
          type="text"
          placeholder="请输入昵称"
          v-model="formData.name"
          maxlength="20"
        />
      </view>

      <view class="input-group">
        <text class="label">备注</text>
        <input
          class="input"
          type="text"
          placeholder="请输入备注（选填）"
          v-model="formData.hospitalNumber"
          maxlength="20"
        />
      </view>

      <u-button type="primary" @click="submit" :disabled="!canSubmit">
        完成注册
      </u-button>
    </view>

    <view class="tips">
      <text class="tips-text">带 * 的为必填项</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from "vue";
import StorageUtil from "../../utils/storage.js";
import { authAPI } from "../../api/index.js";

// 表单数据
const formData = ref({
  name: "",
  hospitalNumber: "",
});

// 计算属性 - 检查是否可以提交
const canSubmit = computed(() => {
  return (
    formData.value.name.trim()
  );
});

// 提交注册
const submit = async () => {
	
	console.log(canSubmit.value)
	
  if (!canSubmit.value) {
    uni.showToast({
      title: "请填写完整必填信息",
      icon: "none",
    });
    return;
  }

  try {
    uni.showLoading({
      title: "注册中...",
    });

    // 获取用户信息
    const userInfo = StorageUtil.getUserInfo();

    // 调用API注册接口
    const result = await authAPI.register({
      userId: userInfo._id,
      ...formData.value
    });

    uni.hideLoading();

    if (result.code === 0) {
      uni.showToast({
        title: "注册成功",
        icon: "success",
      });

      // 更新本地用户信息和token
      const updatedUserInfo = { ...userInfo, ...formData.value };
      StorageUtil.setUserInfo(updatedUserInfo);
      if (result.data.token) {
        StorageUtil.setToken(result.data.token);
      }

      // 跳转到首页
      setTimeout(() => {
        uni.switchTab({
          url: "/pages/index/index",
        });
      }, 1500);
    } else {
      uni.showToast({
        title: result.message || "注册失败",
        icon: "none",
      });
    }
  } catch (error) {
    uni.hideLoading();
    console.error("注册失败:", error);
    uni.showToast({
      title: "注册失败，请重试",
      icon: "none",
    });
  }
};
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 40rpx;
}

.header {
  text-align: center;
  margin-bottom: 60rpx;
  margin-top: 60rpx;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 15rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: #666;
}

.form-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
}

.input-group {
  margin-bottom: 40rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 15rpx;
  font-weight: 500;
}

.required {
  color: #ff4757;
}

.input {
  height: 80rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  background: #f8f9fa;
}

.radio-group {
  display: flex;
  gap: 40rpx;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 15rpx;
  padding: 20rpx 30rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 10rpx;
  background: #f8f9fa;
  transition: all 0.3s;
}

.radio-item.active {
  border-color: #3c9cff;
  background: #f0f2ff;
}

.radio-circle {
  width: 30rpx;
  height: 30rpx;
  border: 2rpx solid #ccc;
  border-radius: 50%;
  position: relative;
  transition: all 0.3s;
}

.radio-item.active .radio-circle {
  border-color: #3c9cff;
  background: #3c9cff;
}

.radio-item.active .radio-circle::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 12rpx;
  height: 12rpx;
  background: #fff;
  border-radius: 50%;
}

.radio-text {
  font-size: 28rpx;
  color: #333;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(90deg, #87ceeb 3.3%, #77d9d3 97.8%);
  color: #fff !important;
  border: none;
  border-radius: 10rpx;
  font-size: 32rpx;
  font-weight: bold;
  margin-top: 20rpx;
}

.submit-btn:disabled {
  background: #ccc;
}

.tips {
  text-align: center;
}

.tips-text {
  font-size: 24rpx;
  color: #999;
}
</style>
