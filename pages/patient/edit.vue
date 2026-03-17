<template>
  <view class="edit-patient-container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <u-loading-icon mode="spinner" size="40"></u-loading-icon>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 表单内容 -->
    <view v-else class="form-content">
      <view class="form-title">
        <text class="subtitle-text">请修改患者的基本信息</text>
      </view>

      <view class="form-section">
        <!-- 昵称 -->
        <view class="form-item">
          <text class="label">昵称 <text class="required">*</text></text>
          <input
            class="input"
            type="text"
            placeholder="请输入昵称"
            v-model="formData.name"
            maxlength="20"
          />
        </view>

        <!-- 备注 -->
        <view class="form-item">
          <text class="label">备注</text>
          <input
            class="input"
            type="text"
            placeholder="请输入备注（选填）"
            v-model="formData.hospitalNumber"
            maxlength="20"
          />
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-actions">
      <u-button type="default" @click="goBack" :disabled="submitting">
        取消
      </u-button>
      <u-button
        type="primary"
        @click="submitForm"
        :loading="submitting"
        :disabled="!canSubmit"
      >
        保存修改
      </u-button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { patientAPI } from "../../api/index.js";

// 响应式数据
const loading = ref(false);
const submitting = ref(false);
const patientId = ref("");

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

// 页面加载
onLoad((options) => {
  if (options.id) {
    patientId.value = options.id;
    loadPatientInfo();
  } else {
    uni.showToast({
      title: "患者ID不能为空",
      icon: "none",
    });
    goBack();
  }
});

// 加载患者信息
const loadPatientInfo = async () => {
  loading.value = true;
  try {
    const result = await patientAPI.getPatientDetail(patientId.value);
    if (result.code === 0) {
      const patient = result.data.patient;

      // 填充表单数据
      formData.value = {
        name: patient.name || "",
        hospitalNumber: patient.hospitalNumber || "",
      };

      console.log("患者信息加载成功:", patient);
    } else {
      uni.showToast({
        title: result.message || "加载患者信息失败",
        icon: "none",
      });
      goBack();
    }
  } catch (error) {
    console.error("加载患者信息失败:", error);
    uni.showToast({
      title: "加载患者信息失败",
      icon: "none",
    });
    goBack();
  } finally {
    loading.value = false;
  }
};

// 提交表单
const submitForm = async () => {
  if (!canSubmit.value) {
    uni.showToast({
      title: "请填写完整必填信息",
      icon: "none",
    });
    return;
  }

  try {
    submitting.value = true;

    const submitData = {
      name: formData.value.name.trim(),
      hospitalNumber: formData.value.hospitalNumber.trim() || undefined,
    };

    const result = await patientAPI.updatePatient(patientId.value, submitData);

    if (result.code === 0) {
      uni.showToast({
        title: "修改患者信息成功",
        icon: "success",
      });

      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        goBack();
      }, 1500);
    } else {
      uni.showToast({
        title: result.message || "修改患者信息失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("修改患者信息失败:", error);
    uni.showToast({
      title: "修改患者信息失败，请重试",
      icon: "none",
    });
  } finally {
    submitting.value = false;
  }
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};
</script>

<style scoped>
.edit-patient-container {
  height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #999;
}

.form-content {
  flex: 1;
  padding: 30rpx;
  overflow-y: auto;
}

.form-title {
  text-align: center;
  margin-bottom: 40rpx;
}

.subtitle-text {
  display: block;
  font-size: 26rpx;
  color: #666;
}

.form-section {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.form-item {
  margin-bottom: 30rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 15rpx;
  font-weight: 500;
}

.required {
  color: #ff4d4f;
}

.input {
  width: 100%;
  height: 80rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333;
  background: #ffffff;
  box-sizing: border-box;
}

.input:focus {
  border-color: #007aff;
}

.error-text {
  display: block;
  font-size: 24rpx;
  color: #ff4d4f;
  margin-top: 8rpx;
}

.radio-group {
  display: flex;
  gap: 30rpx;
}

.radio-item {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 8rpx;
  background: #ffffff;
  transition: all 0.3s;
}

.radio-item.active {
  border-color: #007aff;
  background: #f0f8ff;
}

.radio-circle {
  width: 32rpx;
  height: 32rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 50%;
  margin-right: 15rpx;
  position: relative;
  transition: all 0.3s;
}

.radio-item.active .radio-circle {
  border-color: #007aff;
  background: #007aff;
}

.radio-item.active .radio-circle::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 16rpx;
  height: 16rpx;
  background: #ffffff;
  border-radius: 50%;
}

.radio-text {
  font-size: 28rpx;
  color: #333;
}

.bottom-actions {
  background: #ffffff;
  padding: 30rpx 30rpx 64rpx;
  border-top: 1rpx solid #e5e5e5;
  display: flex;
  gap: 20rpx;
}

.bottom-actions .u-button {
  flex: 1;
}
</style>
