<template>
  <scroll-view scroll-y class="patient-detail-container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <u-loading-icon mode="spinner" size="40"></u-loading-icon>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 患者详情内容 -->
    <view v-else-if="patient">
      <!-- 患者基本信息 -->
      <view class="info-section">
        <view class="section-title">
          <u-icon name="account" size="20" color="#007AFF"></u-icon>
          <text class="title-text">基本信息</text>
          <view class="action-buttons">
            <u-button
              type="warning"
              size="small"
              :custom-style="{ width: '180rpx', marginRight: '20rpx' }"
              @click="goToProductVerification"
            >
              <u-icon name="gift" size="14" color="#FFFFFF"></u-icon>
              商品核销
            </u-button>
            <u-button
              type="primary"
              size="small"
              :custom-style="{ width: '180rpx' }"
              @click="editPatient"
            >
              <u-icon name="edit-pen" size="14" color="#FFFFFF"></u-icon>
              编辑
            </u-button>
          </view>
        </view>

        <view class="info-card">
          <view class="info-list">
            <view class="info-item">
              <text class="label">昵称</text>
              <text class="value">{{ patient.name || "未设置" }}</text>
            </view>
            <view class="info-item">
              <text class="label">备注</text>
              <text class="value">{{
                patient.hospitalNumber || "未设置"
              }}</text>
            </view>
            <view class="info-item">
              <text class="label">手机号</text>
              <text class="value">{{ formatPhone(patient.phone) }}</text>
            </view>
            <view class="info-item">
              <text class="label">注册时间</text>
              <text class="value">{{ formatDate(patient.createTime) }}</text>
            </view>
            <view class="info-item">
              <text class="label">当前状态</text>
              <view
                class="status-badge"
                :class="getStatusClass(patient.status)"
              >
                {{ getStatusText(patient.status) }}
              </view>
            </view>
            <view class="info-item">
              <text class="label">订阅次数</text>
              <text class="value">{{ patient.subscriptionCount || 0 }}次</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 用药计划 -->
      <view class="medication-plans-section">
        <view class="section-title">
          <u-icon name="list" size="20" color="#4ECDC4"></u-icon>
          <text class="title-text">用药计划</text>
          <u-button
            type="primary"
            size="small"
            :custom-style="{ width: '180rpx', marginLeft: 'auto' }"
            @click="addMedication"
          >
            <u-icon name="plus" size="14" color="#FFFFFF"></u-icon>
            添加用药
          </u-button>
        </view>

        <view class="medication-plans-card">
          <view v-if="medicationPlans.length === 0" class="empty-plans">
            <u-icon name="info-circle" size="60" color="#CCCCCC"></u-icon>
            <text class="empty-text">暂无用药计划</text>
          </view>

          <view v-else class="plans-list">
            <view
              v-for="(plan, index) in medicationPlans"
              :key="plan._id"
              class="plan-item"
              :class="getPlanClass(plan)"
            >
              <view class="plan-header">
                <view class="plan-info">
                  <text class="plan-name">{{ plan.medication_name }}</text>
                  <view
                    class="plan-status"
                    :class="getPlanStatusClass(plan.status)"
                  >
                    {{ getPlanStatusText(plan.status) }}
                  </view>
                </view>
                <view class="plan-actions">
                  <u-button
                    type="warning"
                    size="mini"
                    @click="editPlan(plan)"
                    :custom-style="{ marginRight: '10rpx' }"
                  >
                    修改
                  </u-button>
                  <u-button type="error" size="mini" @click="deletePlan(plan)">
                    删除
                  </u-button>
                </view>
              </view>

              <view class="plan-details">
                <view class="plan-dates">
                  <text class="date-label">起止时间：</text>
                  <text class="date-value"
                    >{{ plan.start_date_formatted }} -
                    {{ plan.end_date_formatted }}</text
                  >
                </view>
                <view class="plan-times">
                  <text class="times-label">用药时间：</text>
                  <text class="times-value">
                    {{
                      plan.time_slots
                        .map(
                          (slot) =>
                            `${slot.time}(${slot.dosage_amount}${slot.dosage_unit})`
                        )
                        .join("、")
                    }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 今日用药提醒 -->
      <view class="medication-section">
        <view class="section-title">
          <u-icon name="calendar" size="20" color="#FF6B6B"></u-icon>
          <text class="title-text">今日用药提醒</text>
        </view>

        <view class="medication-card">
          <view v-if="medications.length === 0" class="empty-medication">
            <u-icon name="info-circle" size="60" color="#CCCCCC"></u-icon>
            <text class="empty-text">今日暂无用药提醒</text>
          </view>

          <view v-else class="medication-list">
            <view
              v-for="(medication, index) in medications"
              :key="medication._id"
              class="medication-item"
              :class="getMedicationClass(medication)"
            >
              <view class="medication-time">
                <text class="time">{{ medication.formattedTime }}</text>
                <text class="status-text">{{
                  getMedicationStatusText(medication.status)
                }}</text>
              </view>

              <view class="medication-details">
                <view
                  v-for="(med, medIndex) in medication.medications"
                  :key="med._id"
                  class="med-detail"
                >
                  <text class="med-name">{{ med.medication_name }}</text>
                  <text class="med-dosage"
                    >x {{ med.dosage_amount }}{{ med.dosage_unit }}</text
                  >
                  <text class="med-notes" v-if="med.notes">{{
                    med.notes
                  }}</text>
                </view>
              </view>

              <!-- 提醒用药按钮 -->
              <view
                class="medication-actions"
                v-if="medication.status === 'pending'"
              >
                <u-button
                  type="primary"
                  size="mini"
                  :loading="sendingReminder[medication._id]"
                  @click="sendMedicationReminder(medication)"
                  :custom-style="{ marginTop: '10rpx' }"
                >
                  <u-icon
                    name="bell"
                    size="12"
                    color="#FFFFFF"
                    style="marginright: '4rpx'"
                  ></u-icon>
                  {{
                    sendingReminder[medication._id] ? "发送中..." : "提醒用药"
                  }}
                </u-button>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 用药历史 -->
      <view class="history-section">
        <view class="section-title">
          <u-icon name="clock" size="20" color="#4ECDC4"></u-icon>
          <text class="title-text">用药历史</text>
        </view>

        <view class="history-card">
          <view class="history-stats">
            <view class="stat-item">
              <text class="stat-number">{{ historyStats.total }}</text>
              <text class="stat-label">总用药次数</text>
            </view>
            <view class="stat-item">
              <text class="stat-number">{{ historyStats.taken }}</text>
              <text class="stat-label">已用药</text>
            </view>
            <view class="stat-item">
              <text class="stat-number">{{ historyStats.missed }}</text>
              <text class="stat-label">未用药</text>
            </view>
          </view>

          <view class="history-list">
            <view
              v-for="(record, index) in medicationHistory"
              :key="record._id"
              class="history-item"
            >
              <view class="history-date">
                <text class="date">{{ record.formattedDate }}</text>
                <text class="time">{{ record.formattedTime }}</text>
              </view>
              <view class="history-medication">
                <view
                  v-for="(med, medIndex) in record.medications"
                  :key="med._id"
                  class="med-detail"
                >
                  <text class="med-name">{{ med.medication_name }}</text>
                  <text class="med-dosage"
                    >x {{ med.dosage_amount }}{{ med.dosage_unit }}</text
                  >
                  <text class="med-notes" v-if="med.notes">{{
                    med.notes
                  }}</text>
                </view>
              </view>
              <view
                class="history-status"
                :class="getHistoryStatusClass(record.status)"
              >
                {{ getHistoryStatusText(record.status) }}
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else class="error-state">
      <u-icon name="error-circle" size="80" color="#FF6B6B"></u-icon>
      <text class="error-text">患者信息加载失败</text>
      <u-button type="primary" @click="loadPatientDetail">重试</u-button>
    </view>
  </scroll-view>
</template>

<script setup>
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ref, onMounted } from "vue";
import { patientAPI } from "../../api/index.js";
import { formatDate, formatTime } from "../../utils/index.js";

// 响应式数据
const loading = ref(false);
const patient = ref(null);
const medications = ref([]);
const medicationHistory = ref([]);
const medicationPlans = ref([]);
const patientId = ref("");
const sendingReminder = ref({}); // 改为对象，用于跟踪每个按钮的loading状态

// 计算属性
const historyStats = ref({
  total: 0,
  taken: 0,
  missed: 0,
});

// 页面加载
onLoad((options) => {
  if (options.id) {
    patientId.value = options.id;
  } else {
    uni.showToast({
      title: "患者ID不能为空",
      icon: "none",
    });
    goBack();
  }
});

// 页面显示时加载数据
onShow(() => {
  if (patientId.value) {
    loadPatientDetail();
  }
});

// 加载患者详情
const loadPatientDetail = async () => {
  loading.value = true;
  try {
    const result = await patientAPI.getPatientDetail(patientId.value);
    if (result.code === 0) {
      patient.value = result.data.patient;
      medications.value = result.data.medications || [];
      medicationHistory.value = result.data.history || [];
      medicationPlans.value = result.data.plans || [];

      // 计算历史统计
      calculateHistoryStats();

      console.log("患者详情加载成功:", patient.value);
    } else {
      uni.showToast({
        title: result.message || "加载患者详情失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("加载患者详情失败:", error);
    uni.showToast({
      title: "加载患者详情失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

// 计算历史统计
const calculateHistoryStats = () => {
  const stats = {
    total: 0,
    taken: 0,
    missed: 0,
  };

  // 每个时间段只计算一次，而不是每种药品都计算
  medicationHistory.value.forEach((record) => {
    stats.total += record.totalCount; // 每个时间段最多为1
    stats.taken += record.takenCount; // 每个时间段最多为1
    stats.missed += record.missedCount; // 每个时间段最多为1
  });

  historyStats.value = stats;
};

// 跳转到商品核销页面
const goToProductVerification = () => {
  uni.navigateTo({
    url: `/pages/patient/product?patientId=${patientId.value}&patientName=${
      patient.value?.name || ""
    }`,
  });
};

// 编辑患者
const editPatient = () => {
  uni.navigateTo({
    url: `/pages/patient/edit?id=${patientId.value}`,
  });
};

// 添加用药
const addMedication = () => {
  uni.navigateTo({
    url: `/pages/medication/add?patientId=${patientId.value}`,
  });
};

// 编辑用药计划
const editPlan = (plan) => {
  uni.navigateTo({
    url: `/pages/medication/edit?planId=${plan._id}`,
  });
};

// 删除用药计划
const deletePlan = async (plan) => {
  uni.showModal({
    title: "确认删除",
    content: `确定要删除用药计划"${plan.medication_name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const result = await patientAPI.deleteMedicationPlan(plan._id);
          if (result.code === 0) {
            uni.showToast({
              title: "删除成功",
              icon: "success",
            });
            // 重新加载数据
            loadPatientDetail();
          } else {
            uni.showToast({
              title: result.message || "删除失败",
              icon: "none",
            });
          }
        } catch (error) {
          console.error("删除用药计划失败:", error);
          uni.showToast({
            title: "删除失败",
            icon: "none",
          });
        }
      }
    },
  });
};

// 发送用药提醒
const sendMedicationReminder = async (medication) => {
  sendingReminder.value[medication._id] = true;
  try {
    const result = await patientAPI.sendMedicationReminder(medication._id);
    if (result.code === 0) {
      uni.showToast({
        title: "提醒发送成功",
        icon: "success",
      });
      // 重新加载数据
      loadPatientDetail();
    } else {
      uni.showToast({
        title: result.message || "提醒发送失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("发送提醒失败:", error);
    uni.showToast({
      title: "发送提醒失败",
      icon: "none",
    });
  } finally {
    sendingReminder.value[medication._id] = false;
  }
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};

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

// 获取用药提醒样式类
const getMedicationClass = (medication) => {
  switch (medication.status) {
    case "pending":
      return "medication-pending";
    case "taken":
      return "medication-taken";
    case "missed":
      return "medication-missed";
    default:
      return "";
  }
};

// 获取用药状态文本
const getMedicationStatusText = (status) => {
  switch (status) {
    case "pending":
      return "待用药";
    case "taken":
      return "已用药";
    case "missed":
      return "未用药";
    default:
      return "待用药";
  }
};

// 获取历史状态样式类
const getHistoryStatusClass = (status) => {
  switch (status) {
    case "taken":
      return "history-taken";
    case "missed":
      return "history-missed";
    default:
      return "history-pending";
  }
};

// 获取历史状态文本
const getHistoryStatusText = (status) => {
  switch (status) {
    case "taken":
      return "已用药";
    case "missed":
      return "未用药";
    default:
      return "待用药";
  }
};

// 获取用药计划样式类
const getPlanClass = (plan) => {
  if (plan.is_expired) {
    return "plan-expired";
  }
  return "plan-active";
};

// 获取用药计划状态样式类
const getPlanStatusClass = (status) => {
  switch (status) {
    case "active":
      return "plan-status-active";
    case "completed":
      return "plan-status-completed";
    case "cancelled":
      return "plan-status-cancelled";
    default:
      return "plan-status-default";
  }
};

// 获取用药计划状态文本
const getPlanStatusText = (status) => {
  switch (status) {
    case "active":
      return "进行中";
    case "completed":
      return "已完成";
    case "cancelled":
      return "已取消";
    default:
      return "未知";
  }
};
</script>

<style scoped>
.patient-detail-container {
  height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
  box-sizing: border-box;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-text,
.error-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #999;
}

.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.title-text {
  margin-left: 10rpx;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.info-section,
.medication-plans-section,
.medication-section,
.history-section {
  margin-bottom: 30rpx;
}

.info-card,
.medication-plans-card,
.medication-card,
.history-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.status-badge {
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
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

.info-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 28rpx;
  color: #666;
}

.value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.empty-medication {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
}

.empty-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #999;
}

.medication-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.medication-item {
  border: 1rpx solid #e5e5e5;
  border-radius: 12rpx;
  padding: 20rpx;
}

.medication-pending {
  border-color: #ffd666;
  background: #fffbe6;
}

.medication-taken {
  border-color: #b7eb8f;
  background: #f6ffed;
}

.medication-missed {
  border-color: #ffa39e;
  background: #fff2f0;
}

.medication-time {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15rpx;
}

.time {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.status-text {
  font-size: 24rpx;
  color: #666;
}

.medication-details {
  margin-bottom: 15rpx;
}

.med-detail {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}

.med-name {
  font-size: 28rpx;
  color: #333;
  margin-right: 20rpx;
}

.med-dosage {
  font-size: 26rpx;
  color: #666;
  margin-right: 20rpx;
}

.med-notes {
  font-size: 24rpx;
  color: #999;
}

.medication-notes {
  font-size: 24rpx;
  color: #666;
  margin-top: 5rpx;
}

.medication-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10rpx;
}

.history-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #e5e5e5;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #007aff;
  margin-bottom: 8rpx;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: #666;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 15rpx;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.history-date {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.date {
  font-size: 26rpx;
  color: #333;
  margin-bottom: 5rpx;
}

.time {
  font-size: 24rpx;
  color: #666;
}

.history-medication {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  margin: 0 20rpx;
}

.history-medication .med-detail {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.history-medication .med-detail:last-child {
  margin-bottom: 0;
}

.history-medication .med-name {
  font-size: 26rpx;
  color: #333;
  margin-right: 15rpx;
}

.history-medication .med-dosage {
  font-size: 24rpx;
  color: #666;
  margin-right: 15rpx;
}

.history-medication .med-notes {
  font-size: 22rpx;
  color: #999;
  flex: 1;
}

.history-status {
  padding: 6rpx 12rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
}

.history-taken {
  background: #e8f5e8;
  color: #52c41a;
}

.history-missed {
  background: #fff2f0;
  color: #ff4d4f;
}

.history-pending {
  background: #fffbe6;
  color: #faad14;
}

/* 用药计划样式 */
.empty-plans {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.plan-item {
  border: 1rpx solid #e5e5e5;
  border-radius: 12rpx;
  padding: 20rpx;
}

.plan-active {
  border-color: #4ecdc4;
  background: #f0fffe;
}

.plan-expired {
  border-color: #ccc;
  background: #f9f9f9;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15rpx;
}

.plan-info {
  display: flex;
  align-items: center;
  gap: 15rpx;
}

.plan-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.plan-status {
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
}

.plan-status-active {
  background: #e6f7ff;
  color: #1890ff;
}

.plan-status-completed {
  background: #f6ffed;
  color: #52c41a;
}

.plan-status-cancelled {
  background: #fff2f0;
  color: #ff4d4f;
}

.plan-status-default {
  background: #f5f5f5;
  color: #999;
}

.plan-actions {
  display: flex;
  gap: 10rpx;
}

.plan-details {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.plan-dates,
.plan-times {
  display: flex;
  align-items: center;
}

.date-label,
.times-label {
  font-size: 26rpx;
  color: #666;
  margin-right: 10rpx;
  min-width: 120rpx;
}

.date-value,
.times-value {
  font-size: 26rpx;
  color: #333;
  flex: 1;
}
</style>
