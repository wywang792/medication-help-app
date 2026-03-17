<template>
  <view class="patient-list-container">
    <!-- 搜索栏 -->
    <view class="search-section">
      <u-search
        v-model="searchKeyword"
        placeholder="搜索患者昵称或手机号"
        @search="handleSearch"
        @clear="handleClear"
        show-action
        action-text="搜索"
      ></u-search>
    </view>

    <!-- 患者列表 -->
    <scroll-view scroll-y class="patient-list">
      <view v-if="loading" class="loading-state">
        <u-loading-icon mode="spinner" size="40"></u-loading-icon>
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="filteredPatients.length === 0" class="empty-state">
        <u-icon name="account-fill" size="80" color="#CCCCCC"></u-icon>
        <text class="empty-text">{{
          searchKeyword ? "未找到匹配的患者" : "暂无患者数据"
        }}</text>
      </view>

      <view v-else class="patient-items">
        <view
          v-for="patient in filteredPatients"
          :key="patient._id"
          class="patient-card"
          @click="viewPatientDetail(patient)"
        >
          <view class="patient-info">
            <view class="patient-avatar">
              <u-avatar
                :text="patient.name ? patient.name.charAt(0) : '患'"
                size="60"
              ></u-avatar>
            </view>
            <view class="patient-details">
              <text class="patient-name">{{
                patient.name || "未设置昵称"
              }}</text>
              <text class="patient-phone">{{
                formatPhone(patient.phone)
              }}</text>
              <view class="patient-meta">
                <text class="patient-number" v-if="patient.hospitalNumber"
                  >备注: {{ patient.hospitalNumber }}</text
                >
              </view>
            </view>
          </view>

          <view class="patient-status">
            <view
              class="status-indicator"
              :class="getStatusClass(patient.status)"
            >
              {{ getStatusText(patient.status) }}
            </view>
            <view class="medication-info" v-if="patient.todayMedications">
              <text class="medication-count"
                >{{ patient.todayMedications }} 个用药提醒</text
              >
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
		
		<!-- 添加按钮 -->
		<view class="bottom-actions">
		  <u-button type="primary" @click="addPatient">
		    <u-icon name="plus" size="16" color="#FFFFFF"></u-icon>
		    <text style="margin-left: 16rpx">添加患者</text>
		  </u-button>
		</view>
  </view>
</template>

<script setup>
import { onShow } from "@dcloudio/uni-app";
import { ref, computed, onMounted } from "vue";
import { patientAPI } from "../../api/index.js";

// 响应式数据
const loading = ref(false);
const patients = ref([]);
const searchKeyword = ref("");

// 计算属性
const filteredPatients = computed(() => {
  if (!searchKeyword.value) {
    return patients.value;
  }

  const keyword = searchKeyword.value.toLowerCase();
  return patients.value.filter((patient) => {
    return (
      (patient.name && patient.name.toLowerCase().includes(keyword)) ||
      (patient.phone && patient.phone.includes(keyword)) ||
      (patient.hospitalNumber && patient.hospitalNumber.includes(keyword))
    );
  });
});

const totalPatients = computed(() => patients.value.length);
const activePatients = computed(
  () => patients.value.filter((p) => p.status === "active").length
);
const todayMedications = computed(() => {
  return patients.value.reduce((total, patient) => {
    return total + (patient.todayMedications || 0);
  }, 0);
});

// 生命周期
onMounted(() => {
  loadPatientList();
});

// 加载患者列表
const loadPatientList = async () => {
  loading.value = true;
  try {
    const result = await patientAPI.getPatientList();
    if (result.code === 0) {
      patients.value = result.data.patients || [];
      console.log("患者列表加载成功:", patients.value);
    } else {
      uni.showToast({
        title: result.message || "加载患者列表失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("加载患者列表失败:", error);
    uni.showToast({
      title: "加载患者列表失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

// 刷新列表
const refreshList = () => {
  loadPatientList();
};

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑已在计算属性中处理
  console.log("搜索关键词:", searchKeyword.value);
};

// 清除搜索
const handleClear = () => {
  searchKeyword.value = "";
};

// 查看患者详情
const viewPatientDetail = (patient) => {
  uni.navigateTo({
    url: `/pages/patient/detail?id=${patient._id}`,
  });
};

// 页面显示时刷新列表
onShow(() => {
  loadPatientList();
});

// 格式化手机号
const formatPhone = (phone) => {
  if (!phone) return "";
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
};

// 获取状态样式类
const getStatusClass = (status) => {
  switch (status) {
    case "active":
      return "status-active";
    case "inactive":
      return "status-inactive";
    default:
      return "status-default";
  }
};

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case "active":
      return "活跃";
    case "inactive":
      return "非活跃";
    default:
      return "未知";
  }
};

// 添加患者
const addPatient = () => {
	uni.navigateTo({
		url: "/pages/patient/add"
	})
}
</script>

<style scoped>
.patient-list-container {
  height: 100vh;
  background: #f5f5f5;
  padding: 0 0 30rpx;
  box-sizing: border-box;
}

.search-section {
  background: #ffffff;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #e5e5e5;
}

.patient-list {
  height: calc(100vh - 40rpx - 40px - 94rpx - 40px);
  padding: 30rpx 30rpx;
  box-sizing: border-box;
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

.patient-items {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.patient-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.patient-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.patient-avatar {
  margin-right: 20rpx;
}

.patient-details {
  flex: 1;
}

.patient-name {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.patient-phone {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.patient-meta {
  display: flex;
  gap: 20rpx;
}

.patient-age,
.patient-gender,
.patient-number {
  font-size: 24rpx;
  color: #999;
}

.patient-status {
  text-align: right;
}

.status-indicator {
  display: inline-block;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  margin-bottom: 10rpx;
}

.status-active {
  background: #e8f5e8;
  color: #52c41a;
}

.status-inactive {
  background: #fff2e8;
  color: #fa8c16;
}

.status-default {
  background: #f5f5f5;
  color: #999;
}

.medication-info {
  text-align: right;
}

.medication-count {
  font-size: 24rpx;
  color: #007aff;
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
