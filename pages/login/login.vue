<template>
  <view class="login-container">
    <view class="logo-section">
      <image src="/static/logo.png" class="logo" mode="aspectFit"></image>
      <text class="app-title">护心小管家</text>
      <text class="app-subtitle">您的术后贴心小管家</text>
    </view>

    <view class="form-section">
      <!-- 登录方式切换 -->
      <view class="login-type-switch">
        <view
          class="switch-item"
          :class="{ active: loginType === 'password' }"
          @click="switchLoginType('password')"
        >
          <text class="switch-text">账号密码登录</text>
        </view>
        <view
          class="switch-item"
          :class="{ active: loginType === 'sms' }"
          @click="switchLoginType('sms')"
        >
          <text class="switch-text">短信验证码登录</text>
        </view>
      </view>

      <view class="input-group">
        <input
          class="input"
          type="number"
          placeholder="请输入手机号"
          v-model="phone"
          maxlength="11"
        />
      </view>

      <!-- 账号密码登录 -->
      <view v-if="loginType === 'password'" class="input-group">
        <input
          class="input"
          type="text"
					password
          placeholder="请输入密码"
          v-model="password"
          maxlength="20"
        />
      </view>

      <!-- 短信验证码登录 -->
      <view v-if="loginType === 'sms'" class="input-group">
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

      <u-button
        type="primary"
        :disabled="!canLogin || loginLoading"
        :loading="loginLoading"
        @click="login"
      >
        {{ loginLoading ? "登录中..." : "登录" }}
      </u-button>

      <!-- 忘记密码链接 -->
      <!-- <view v-if="loginType === 'password'" class="forgot-password">
        <text class="forgot-link" @click="goToResetPassword">忘记密码？</text>
      </view> -->
    </view>

    <view class="tips">
      <text class="tips-text">登录即表示同意《用户协议》和《隐私政策》</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from "vue";
import StorageUtil from "../../utils/storage.js";
import { authAPI } from "../../api/index.js";

// 响应式数据
const phone = ref("");
const password = ref("");
const code = ref("");
const countdown = ref(0);
const sendCodeLoading = ref(false);
const loginLoading = ref(false);

// 登录方式：password-账号密码，sms-短信验证码
const loginType = ref("password");

// 计算属性
const canSendCode = computed(() => {
  return /^1[3-9]\d{9}$/.test(phone.value);
});

const canLogin = computed(() => {
  if (loginType.value === "password") {
    return canSendCode.value && password.value.length >= 6;
  } else {
    return canSendCode.value && code.value.length === 6;
  }
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
    // 调用API发送验证码
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

// 获取微信登录code
const getWechatCode = async () => {
  try {
    const loginResult = await uni.login({
      provider: "weixin",
    });

    if (loginResult.code) {
      return loginResult.code;
    } else {
      console.error("获取微信登录code失败:", loginResult);
      return null;
    }
  } catch (error) {
    console.error("微信登录失败:", error);
    return null;
  }
};

// 登录
const login = async () => {
  if (!canLogin.value) {
    uni.showToast({
      title: "请填写完整信息",
      icon: "none",
    });
    return;
  }

  if (loginLoading.value) {
    return;
  }

  loginLoading.value = true;

  try {
    uni.showLoading({
      title: "登录中...",
    });

    // 获取微信登录code
    const wechatCode = await getWechatCode();

    if (!wechatCode) {
      uni.hideLoading();
      uni.showToast({
        title: "微信登录失败，请重试",
        icon: "none",
      });
      return;
    }

    let result;

    // 根据登录方式调用不同的登录接口
    if (loginType.value === "password") {
      // 账号密码登录
      result = await authAPI.loginWithPassword(
        phone.value,
        password.value,
        wechatCode
      );
    } else {
      // 短信验证码登录
      result = await authAPI.loginWithSms(phone.value, code.value, wechatCode);
    }

    uni.hideLoading();

    if (result.code === 0) {
      // 登录成功
      const userInfo = result.data;

      // 存储用户信息
      StorageUtil.setUserInfo(userInfo);
      StorageUtil.setToken(userInfo.token);

      uni.reLaunch({
        url: "/pages/launch/launch",
      });
    } else {
      // 登录失败，显示错误信息
      uni.showToast({
        title: result.message || "登录失败",
        icon: "none",
      });
    }
  } catch (error) {
    uni.hideLoading();
    console.error("登录失败:", error);
    uni.showToast({
      title: "登录失败，请重试",
      icon: "none",
    });
  } finally {
    loginLoading.value = false;
  }
};

// 切换登录方式
const switchLoginType = (type) => {
  if (loginType.value === type) return;

  // 清空当前输入内容
  password.value = "";
  code.value = "";
  countdown.value = 0;

  // 切换登录方式
  loginType.value = type;

  // 显示切换提示
  const typeText = type === "password" ? "账号密码登录" : "短信验证码登录";
};

// 跳转到密码重置页面
const goToResetPassword = () => {
  uni.navigateTo({
    url: "/pages/login/reset-password",
  });
};
</script>

<style scoped>
.login-container {
  height: 100vh;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.logo-section {
  text-align: center;
  margin-bottom: 80rpx;
  margin-top: 100rpx;
}

.logo {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 20rpx;
}

.app-title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 10rpx;
}

.app-subtitle {
  display: block;
  font-size: 28rpx;
  color: #4b5563;
}

.form-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
}

.login-type-switch {
  display: flex;
  background: #f8f9fa;
  border-radius: 12rpx;
  padding: 4rpx;
  margin-bottom: 32rpx;
}

.switch-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 8rpx;
  transition: all 0.3s ease;
  cursor: pointer;
}

.switch-item.active {
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.switch-text {
  font-size: 28rpx;
  color: #666;
  transition: color 0.3s ease;
}

.switch-item.active .switch-text {
  color: #007aff;
  font-weight: 500;
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
  background: #f8f9fa;
}

.login-btn {
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

.login-btn:disabled {
  background: #ccc;
}

.forgot-password {
  text-align: center;
  margin-top: 20rpx;
}

.forgot-link {
  font-size: 26rpx;
  color: #007aff;
  text-decoration: underline;
}

.tips {
  margin-top: 32rpx;
  text-align: center;
}

.tips-text {
  font-size: 26rpx;
  color: #4b5563;
}
</style>
