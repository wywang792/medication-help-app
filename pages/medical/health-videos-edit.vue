<template>
  <view class="video-edit-container">
    <!-- 表单内容 -->
    <scroll-view class="form-section" scroll-y>
      <view class="form-card">
        <!-- 视频标题 -->
        <view class="form-item">
          <text class="form-label">视频标题</text>
          <u-input
            v-model="formData.title"
            placeholder="请输入视频标题"
            border="none"
            :custom-style="{
              backgroundColor: '#f8f9fa',
              padding: '20rpx',
              borderRadius: '8rpx',
            }"
          ></u-input>
        </view>

        <!-- 视频描述 -->
        <view class="form-item">
          <text class="form-label">视频描述</text>
          <u-input
            v-model="formData.description"
            placeholder="请输入视频描述"
            border="none"
            :custom-style="{
              backgroundColor: '#f8f9fa',
              padding: '20rpx',
              borderRadius: '8rpx',
            }"
          ></u-input>
        </view>

        <!-- 视频文件上传 -->
        <view class="form-item">
          <text class="form-label">视频文件</text>
          <view class="video-upload">
            <view
              v-if="!formData.video_url"
              class="upload-placeholder"
              @click="chooseVideo"
            >
              <u-icon name="play-circle" size="40" color="#CCCCCC"></u-icon>
              <text class="upload-text">点击上传视频文件</text>
            </view>
            <view v-else class="video-preview">
              <video
                :src="formData.video_url"
                class="video-player"
                controls
                show-center-play-btn
                show-play-btn
                show-fullscreen-btn
              ></video>
              <view class="video-actions">
                <u-button type="default" size="small" @click="chooseVideo"
                  >重新选择</u-button
                >
                <u-button type="error" size="small" @click="removeVideo"
                  >删除</u-button
                >
              </view>
            </view>
          </view>
        </view>

        <!-- 视频封面 -->
        <view class="form-item">
          <text class="form-label">视频封面</text>
          <view class="cover-upload">
            <view
              v-if="!formData.cover_image"
              class="upload-placeholder"
              @click="chooseCover"
            >
              <u-icon name="camera" size="40" color="#CCCCCC"></u-icon>
              <text class="upload-text">点击上传封面</text>
            </view>
            <view v-else class="cover-preview">
              <image
                :src="formData.cover_image"
                class="cover-image"
                mode="aspectFit"
              ></image>
              <view class="cover-actions">
                <u-button type="default" size="small" @click="chooseCover"
                  >重新选择</u-button
                >
                <u-button type="error" size="small" @click="removeCover"
                  >删除</u-button
                >
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 操作按钮 -->
    <view class="bottom-actions">
      <u-button
        type="default"
        :plain="true"
        :hairline="true"
        @click="goBack"
        :custom-style="{ width: '45%' }"
      >
        取消
      </u-button>
      <u-button
        type="primary"
        :loading="saving"
        @click="saveVideo"
        :custom-style="{ width: '45%' }"
      >
        {{ saving ? "保存中..." : "保存" }}
      </u-button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { contentAPI } from "../../api/index.js";

// 响应式数据
const formData = ref({
  title: "",
  description: "",
  video_url: "",
  cover_image: "",
  duration: "",
  sort_order: "",
  status: "disabled",
});

const saving = ref(false);
const videoId = ref("");

// 计算属性
const isEdit = computed(() => !!videoId.value);

// 页面加载
onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const query = currentPage.options;

  if (query.id) {
    videoId.value = query.id;
    loadVideoData();
  }
});

// 加载视频数据
const loadVideoData = async () => {
  try {
    const result = await contentAPI.getVideoDetail(videoId.value);
    if (result.code === 0) {
      const video = result.data.video;
      formData.value = {
        title: video.title || "",
        description: video.description || "",
        video_url: video.video_url || "",
        cover_image: video.cover_image || "",
        duration: video.duration ? String(video.duration) : "",
        sort_order: video.sort_order ? String(video.sort_order) : "",
        status: video.status || "disabled",
      };
    } else {
      uni.showToast({
        title: result.message || "加载视频数据失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("加载视频数据失败:", error);
    uni.showToast({
      title: "加载视频数据失败",
      icon: "none",
    });
  }
};

// 选择视频文件
const chooseVideo = () => {
  uni.chooseVideo({
    count: 1,
    sourceType: ["album", "camera"],
    maxDuration: 60, // 最大5分钟
    success: async (res) => {
      try {
        uni.showLoading({ title: "上传中..." });

        // 获取文件后缀名
        const filePath = res.tempFilePath;
        const fileExtension = getFileExtension(filePath);

        const uploadPath = `videos/${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}.${fileExtension}`;

        const extStorage = uniCloud.importObject("ext-storage");
        const uploadOptionsRes = await extStorage.getUploadFileOptions({
          cloudPath: uploadPath,
        });

        // 使用扩展存储上传视频
        const uploadResult = await uni.uploadFile({
          ...uploadOptionsRes.uploadFileOptions,
          filePath: filePath,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            uni.showLoading({ title: `上传中 ${percentCompleted}%` });
          },
        });

        console.log("视频上传成功", uploadResult);
        formData.value.video_url = uploadOptionsRes.fileURL;

        uni.showToast({
          title: "视频上传成功",
          icon: "success",
        });
      } catch (error) {
        console.error("上传视频失败:", error);
        uni.showToast({
          title: "上传视频失败",
          icon: "none",
        });
      } finally {
        uni.hideLoading();
      }
    },
    fail: (err) => {
      console.error("选择视频失败:", err);
      uni.showToast({
        title: "选择视频失败",
        icon: "none",
      });
    },
  });
};

// 删除视频
const removeVideo = () => {
  uni.showModal({
    title: "确认删除",
    content: "确定要删除已上传的视频吗？",
    success: (res) => {
      if (res.confirm) {
        formData.value.video_url = "";
      }
    },
  });
};

// 选择封面
const chooseCover = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: async (res) => {
      try {
        uni.showLoading({ title: "上传中..." });

        // 获取文件后缀名
        const filePath = res.tempFilePaths[0];
        const fileExtension = getFileExtension(filePath);

        const uploadPath = `covers/${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}.${fileExtension}`;

        const extStorage = uniCloud.importObject("ext-storage");
        const uploadOptionsRes = await extStorage.getUploadFileOptions({
          cloudPath: uploadPath,
        });

        // 使用扩展存储上传封面图片
        const uploadResult = await uni.uploadFile({
          ...uploadOptionsRes.uploadFileOptions,
          filePath: filePath,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            uni.showLoading({ title: `上传中 ${percentCompleted}%` });
          },
        });

        console.log("封面上传成功", uploadResult);
        formData.value.cover_image = uploadOptionsRes.fileURL;

        uni.showToast({
          title: "封面上传成功",
          icon: "success",
        });
      } catch (error) {
        console.error("上传封面失败:", error);
        uni.showToast({
          title: "上传封面失败",
          icon: "none",
        });
      } finally {
        uni.hideLoading();
      }
    },
    fail: (err) => {
      console.error("选择图片失败:", err);
      uni.showToast({
        title: "选择图片失败",
        icon: "none",
      });
    },
  });
};

// 删除封面
const removeCover = () => {
  formData.value.cover_image = "";
};

// 获取文件名
const getFileName = (url) => {
  if (!url) return "";
  const parts = url.split("/");
  return parts[parts.length - 1] || url;
};

// 获取文件后缀名
const getFileExtension = (filePath) => {
  if (!filePath) return "";
  const parts = filePath.split(".");
  return parts[parts.length - 1] || "";
};

// 保存视频
const saveVideo = async () => {
  // 验证必填字段
  if (!formData.value.title.trim()) {
    uni.showToast({
      title: "请输入视频标题",
      icon: "none",
    });
    return;
  }

  if (!formData.value.video_url.trim()) {
    uni.showToast({
      title: "请上传视频文件或输入视频链接",
      icon: "none",
    });
    return;
  }

  saving.value = true;
  try {
    const data = {
      title: formData.value.title.trim(),
      description: formData.value.description.trim(),
      video_url: formData.value.video_url.trim(),
      cover_image: formData.value.cover_image,
      duration: formData.value.duration
        ? parseInt(formData.value.duration)
        : null,
      sort_order: formData.value.sort_order
        ? parseInt(formData.value.sort_order)
        : 0,
      status: formData.value.status,
    };

    let result;
    if (isEdit.value) {
      result = await contentAPI.updateVideo(videoId.value, data);
    } else {
      result = await contentAPI.createVideo(data);
    }

    if (result.code === 0) {
      uni.showToast({
        title: isEdit.value ? "更新成功" : "创建成功",
        icon: "success",
      });

      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        goBack();
      }, 1500);
    } else {
      uni.showToast({
        title: result.message || "操作失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("保存视频失败:", error);
    uni.showToast({
      title: "操作失败",
      icon: "none",
    });
  } finally {
    saving.value = false;
  }
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};
</script>

<style scoped>
.video-edit-container {
  height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
  padding-top: 0;
  box-sizing: border-box;
}

.form-section {
  height: calc(100vh - 40rpx - 94rpx - 40px);
  margin-bottom: 30rpx;
}

.form-card {
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

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
  font-weight: bold;
}

.video-upload,
.cover-upload {
  margin-top: 16rpx;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 200rpx;
  background: #f8f9fa;
  border: 2rpx dashed #cccccc;
  border-radius: 8rpx;
  cursor: pointer;
}

.upload-text {
  margin-top: 16rpx;
  font-size: 28rpx;
  color: #999;
}

.video-preview,
.cover-preview {
  background: #f8f9fa;
  border-radius: 8rpx;
  padding: 20rpx;
}

.video-player {
  width: 100%;
  height: 360rpx;
}

.cover-image {
  height: 360rpx;
}

.video-actions,
.cover-actions {
  display: flex;
  gap: 10rpx;
}

.bottom-actions {
  display: flex;
  gap: 20rpx;
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
