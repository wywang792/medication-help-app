<template>
  <view class="reset-password-container">
    <view class="form-section">
      <view class="input-group">
        <input
          class="input"
          type="number"
          placeholder="请输入手机号"
          v-model="phone"
          maxlength="11"
        />
      </view>

      <view class="input-group">
        <input
          class="input"
          type="number"
          placeholder="请输入验证码"
          v-model="code"
          maxlength="6"
        />
        <u-button
          type="primary"
          :custom-style="{ width: '200rpx' }"
          :loading="sendCodeLoading"
          :disabled="!canSendCode || countdown > 0"
          @click="sendCode"
        >
          {{ countdown > 0 ? `${countdown}s` : "获取验证码" }}
        </u-button>
      </view>

      <view class="input-group">
        <input
          class="input"
          type="password"
          placeholder="请输入新密码（至少6位）"
          v-model="newPassword"
          maxlength="20"
        />
      </view>

      <view class="input-group">
        <input
          class="input"
          type="password"
          placeholder="请确认新密码"
          v-model="confirmPassword"
          maxlength="20"
        />
      </view>

      <u-button
        type="primary"
        :disabled="!canReset || resetLoading"
        :loading="resetLoading"
        @click="resetPassword"
      >
        {{ resetLoading ? "重置中..." : "重置密码" }}
      </u-button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from "vue";
import { authAPI } from "../../api/index.js";

// 响应式数据
const phone = ref("");
const code = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const countdown = ref(0);
const sendCodeLoading = ref(false);
const resetLoading = ref(false);

// 计算属性
const canSendCode = computed(() => {
  return /^1[3-9]\d{9}$/.test(phone.value);
});

const canReset = computed(() => {
  return (
    canSendCode.value &&
    code.value.length === 6 &&
    newPassword.value.length >= 6 &&
    newPassword.value === confirmPassword.value
  );
});

// 发送验证码
const sendCode = async () => {
  if (!canSendCode.value) {
    uni.showToast({
      title: "请输入正确的手机号",
      icon: "none",
    });
    return;
  }

  sendCodeLoading.value = true;

  try {
    const result = await authAPI.sendSmsCode(phone.value);

    if (result.code === 0) {
      uni.showToast({
        title: "验证码已发送",
        icon: "success",
      });
      startCountdown();
    } else {
      uni.showToast({
        title: result.message || "发送失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("发送验证码失败:", error);
    uni.showToast({
      title: "发送失败，请重试",
      icon: "none",
    });
  } finally {
    sendCodeLoading.value = false;
  }
};

// 开始倒计时
const startCountdown = () => {
  countdown.value = 60;
  const timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(timer);
    }
  }, 1000);
};

// 重置密码
const resetPassword = async () => {
  if (!canReset.value) {
    uni.showToast({
      title: "请填写完整信息",
      icon: "none",
    });
    return;
  }

  if (resetLoading.value) {
    return;
  }

  resetLoading.value = true;

  try {
    uni.showLoading({
      title: "重置中...",
    });

    const result = await authAPI.resetPassword(
      phone.value,
      code.value,
      newPassword.value
    );

    uni.hideLoading();

    if (result.code === 0) {
      uni.showToast({
        title: "密码重置成功",
        icon: "success",
      });

      // 延迟跳转到登录页
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    } else {
      uni.showToast({
        title: result.message || "重置失败",
        icon: "none",
      });
    }
  } catch (error) {
    uni.hideLoading();
    console.error("重置密码失败:", error);
    uni.showToast({
      title: "重置失败，请重试",
      icon: "none",
    });
  } finally {
    resetLoading.value = false;
  }
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};
</script>

<style scoped>
.reset-password-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 0;
}

.form-section {
  padding: 40rpx 30rpx;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 32rpx;
}

.input {
  flex: 1;
  height: 80rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  background: #fff;
}
</style>
