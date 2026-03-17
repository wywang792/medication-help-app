<template>
  <view class="add-medication-container">
    <!-- 表单内容 -->
    <scroll-view scroll-y class="form-content">
      <u-form
				ref="formRef"
				labelWidth="220rpx"
				labelPosition="left"
        :model="formData"
        :rules="rules"
      >
        <!-- 基本信息 -->
        <view class="form-section">
          <view class="section-title">
            <u-icon name="info-circle" size="18" color="#007AFF"></u-icon>
            <text class="title-text">基本信息</text>
          </view>

          <u-form-item label="药品名称" prop="medication_name" required>
            <u-input
              v-model="formData.medication_name"
              placeholder="请输入药品名称"
              border="surround"
            ></u-input>
          </u-form-item>

          <u-form-item label="用药开始日期" prop="start_date" required @click="onClickStartDate">
						<u-input
						  v-model="formData.start_date"
						  placeholder="请选择开始日期"
						  border="surround"
							readonly
							@change="onDateChange"
						></u-input>
          </u-form-item>

          <u-form-item label="用药结束日期" prop="end_date" required @click="onClickEndDate">
						<u-input
							v-model="formData.end_date"
							placeholder="请选择结束日期"
							border="surround"
							readonly
							@change="onDateChange"
           ></u-input>
          </u-form-item>
        </view>

        <!-- 用药时间设置 -->
        <view class="form-section">
          <view class="section-title">
            <u-icon name="clock" size="18" color="#FF6B6B"></u-icon>
            <text class="title-text">用药时间设置</text>
            <u-button
              type="primary"
							size="small"
							:custom-style="{ width: '200rpx', marginLeft: 'auto', marginRight: '0' }"
              @click="addTimeSlot"
            >
              <u-icon name="plus" size="12" color="#FFFFFF"></u-icon>
              添加用药时间
            </u-button>
          </view>

          <view v-if="formData.timeSlots.length === 0" class="empty-time-slots">
            <u-icon name="info-circle" size="40" color="#CCCCCC"></u-icon>
            <text class="empty-text">请添加用药时间</text>
          </view>

          <view v-else class="time-slots-list">
            <view
              v-for="(timeSlot, index) in formData.timeSlots"
              :key="index"
              class="time-slot-item"
            >
              <view class="time-slot-header">
                <text class="time-slot-title">用药时间 {{ index + 1 }}</text>
                <u-button
                  type="error"
                  size="mini"
                  @click="removeTimeSlot(index)"
                  :custom-style="{ width: '80rpx', marginLeft: 'auto', marginRight: '0' }"
                >
                  <u-icon name="trash" size="16" color="#FFFFFF"></u-icon>
									删除
                </u-button>
              </view>

              <view class="time-slot-content">
                <!-- 用药时间、剂量、单位一行 -->
                <view class="medication-row">
                  <view class="time-input" @click="onClickTime(index)">
										<u-input
											v-model="timeSlot.time"
											placeholder="用药时间"
											border="surround"
											readonly
										></u-input>
                  </view>
                  <view class="dosage-input">
                    <u-input
                      v-model="timeSlot.dosage_amount"
                      placeholder="剂量"
                      border="surround"
                      type="number"
                    ></u-input>
                  </view>
                  <view class="unit-input">
                    <u-input
                      v-model="timeSlot.dosage_unit"
                      placeholder="单位"
                      border="surround"
                    ></u-input>
                  </view>
                </view>

                <!-- 备注单独一行 -->
                <view class="notes-input">
                  <u-input
                    v-model="timeSlot.notes"
                    placeholder="备注信息（选填）"
                    border="surround"
                    :maxlength="200"
                    count
                  ></u-input>
                </view>
              </view>
            </view>
          </view>
        </view>
      </u-form>
    </scroll-view>

    <!-- 底部操作按钮 -->
    <view class="bottom-actions">
      <u-button
        type="primary"
        size="large"
        @click="submitForm"
        :loading="submitting"
        :disabled="formData.timeSlots.length === 0"
      >
        确认添加
      </u-button>
    </view>
		
		
		<u-datetime-picker
			mode="date"
			:show="datePickerVisible"
			:min-date="minDate"
			@confirm="onConfirmPicker"
		></u-datetime-picker>
		
		<u-datetime-picker
		  mode="time"
			:show="timePickerVisible"
			:filter="timeFilter"
			@confirm="onConfirmPicker"
		></u-datetime-picker>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { patientAPI } from "../../api/index.js";
import dayjs from "dayjs";

const formRef = ref(null);
const submitting = ref(false);
const minDate = ref(dayjs().valueOf());
const datePickerVisible = ref(false);
const timePickerVisible = ref(false);
const currentPicker = ref({});

// 获取页面参数
const patientId = ref("");

// 表单数据
const formData = reactive({
  medication_name: "",
  start_date: dayjs().format("YYYY-MM-DD"),
  end_date: "",
	time: null,
  timeSlots: [],
});

// 表单验证规则
const rules = reactive({
  medication_name: [
    { required: true, message: "请输入药品名称", trigger: "blur" },
  ],
  start_date: [
    { required: true, message: "请选择开始日期", trigger: "change" },
  ],
  end_date: [
		{ required: true, message: "请选择结束日期", trigger: "change" },
	],
});

// 页面加载时获取参数
onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = currentPage.options;

  if (options.patientId) {
    patientId.value = options.patientId;
  }
});

// 日期变化
const onDateChange = () => {
  // 如果结束日期早于开始日期，清空结束日期
  if (formData.start_date && formData.start_date > formData.end_date) {
    formData.end_date = "";
  }
};

const onClickStartDate = () => {
	currentPicker.value = {
		name: 'start'
	}
	datePickerVisible.value = true
}

const onClickEndDate = () => {
	currentPicker.value = {
		name: 'end'
	}
	datePickerVisible.value = true
}

const onClickTime = (index) => {
	currentPicker.value = {
		name: 'time',
		index
	}
	timePickerVisible.value = true
}

const onConfirmPicker = ({ value }) => {
	if(currentPicker.value.name === 'start') {
		formData.start_date = value ? dayjs(value).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD")
		datePickerVisible.value = false
	} 
	if(currentPicker.value.name === 'end') {
		formData.end_date = value ? dayjs(value).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD")
		datePickerVisible.value = false
	}
	if(currentPicker.value.name === 'time') {
		formData.timeSlots[currentPicker.value.index].time = value ? value : "00:00"
		timePickerVisible.value = false
	}
};

// 分钟只显示00和30
const timeFilter = (type, array) => {
	if(type === 'minute') {
		return ['00', '30']
	} else {
		return array
	}
}

// 添加时间槽
const addTimeSlot = () => {
  formData.timeSlots.push({
    time: "",
    dosage_amount: "",
    dosage_unit: "片",
    notes: "",
  });
};

// 移除时间槽
const removeTimeSlot = (index) => {
  formData.timeSlots.splice(index, 1);
};

// 提交表单
const submitForm = async () => {
  try {
    // 验证表单
    const valid = await formRef.value.validate();
    if (!valid) {
      return;
    }

    // 验证时间槽
    if (formData.timeSlots.length === 0) {
      uni.showToast({
        title: "请至少添加一个用药时间",
        icon: "none",
      });
      return;
    }

    // 验证每个时间槽的必填字段
    for (let i = 0; i < formData.timeSlots.length; i++) {
      const slot = formData.timeSlots[i];
      if (!slot.time) {
        uni.showToast({
          title: `请选择第${i + 1}个用药时间`,
          icon: "none",
        });
        return;
      }
      if (!slot.dosage_amount) {
        uni.showToast({
          title: `请输入第${i + 1}个用药剂量`,
          icon: "none",
        });
        return;
      }
    }

    submitting.value = true;

    // 准备提交数据
    const submitData = {
      patient_id: patientId.value,
      medication_name: formData.medication_name,
      start_date: formData.start_date,
      end_date: formData.end_date,
      time_slots: formData.timeSlots.map((slot) => ({
        time: slot.time,
        dosage_amount: parseFloat(slot.dosage_amount),
        dosage_unit: slot.dosage_unit || "片",
        notes: slot.notes || "",
      })),
    };

    // 调用API
    const result = await patientAPI.addMedication(submitData);

    if (result.code === 0) {
      uni.showToast({
        title: "添加用药成功",
        icon: "success",
      });

      // 返回上一页并刷新
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    } else {
      uni.showToast({
        title: result.message || "添加用药失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("添加用药失败:", error);
    uni.showToast({
      title: "添加用药失败",
      icon: "none",
    });
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.add-medication-container {
  height: 100vh;
  background-color: #f8f8f8;
  display: flex;
  flex-direction: column;
}

.form-content {
  height: calc(100vh - 94rpx - 40px - 30rpx);
  padding: 30rpx;
	box-sizing: border-box;
}

.form-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.form-section:first-child {
	margin-bottom: 30rpx;
}

.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.title-text {
  margin-left: 10rpx;
}

.empty-time-slots {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 20rpx;
  background-color: #f8f8f8;
  border-radius: 12rpx;
  border: 2rpx dashed #cccccc;
}

.empty-text {
  margin-top: 20rpx;
  color: #999999;
  font-size: 28rpx;
}

.time-slots-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.time-slot-item {
  background-color: #f8f8f8;
  border-radius: 12rpx;
  padding: 20rpx;
  border: 1rpx solid #e5e5e5;
}

.time-slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 15rpx;
  border-bottom: 1rpx solid #e5e5e5;
}

.time-slot-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
}

.time-slot-content {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 用药时间、剂量、单位一行布局 */
.medication-row {
  display: flex;
  gap: 15rpx;
  align-items: flex-start;
}

.time-input {
  flex: 1;
}

.dosage-input {
  flex: 1;
}

.unit-input {
  flex: 1;
}

/* 备注输入框 */
.notes-input {
  width: 100%;
}

.bottom-actions {
  background-color: #ffffff;
  padding: 30rpx 30rpx 64rpx;
  border-top: 1rpx solid #e5e5e5;
}


:deep(.u-input) {
  background-color: #ffffff;
}

:deep(.u-textarea) {
  background-color: #ffffff;
}
</style>
