<template>
  <view class="article-edit-container">
    <scroll-view class="form-section" scroll-y>
      <!-- 基本信息 -->
      <view class="form-card">
        <view class="form-item">
          <text class="form-label">文章标题</text>
          <u-input
            v-model="articleForm.title"
            placeholder="请输入文章标题"
            border="none"
            :custom-style="{
              backgroundColor: '#f8f9fa',
              padding: '20rpx',
              borderRadius: '8rpx',
            }"
          ></u-input>
        </view>

        <!-- 文章封面 -->
        <view class="form-item">
          <text class="form-label">文章封面</text>
          <view class="cover-upload">
            <view
              v-if="!articleForm.cover_image"
              class="upload-placeholder"
              @click="chooseCover"
            >
              <u-icon name="camera" size="40" color="#CCCCCC"></u-icon>
              <text class="upload-text">点击上传封面</text>
            </view>
            <view v-else class="cover-preview">
              <image
                :src="articleForm.cover_image"
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

        <!-- 排序 -->
        <view class="form-item">
          <text class="form-label">排序顺序</text>
          <u-input
            v-model="articleForm.sort_order"
            placeholder="请输入排序顺序（数字越小越靠前）"
            border="none"
            type="number"
            :custom-style="{
              backgroundColor: '#f8f9fa',
              padding: '20rpx',
              borderRadius: '8rpx',
            }"
          ></u-input>
        </view>

        <view class="form-item">
          <text class="form-label">发布状态</text>
          <u-radio-group v-model="articleForm.status">
            <u-radio
              label="启用"
              name="published"
              :custom-style="{ marginRight: '20px' }"
            ></u-radio>
            <u-radio label="禁用" name="disabled"></u-radio>
          </u-radio-group>
        </view>
      </view>

      <!-- 文章内容 -->
      <view class="form-card">
        <view class="action-buttons">
          <u-button type="primary" size="small" @click="addParagraph">
            添加段落
          </u-button>
          <u-button type="info" size="small" @click="addImage">
            添加图片
          </u-button>
        </view>

        <view
          v-if="articleForm.paragraphs.length === 0"
          class="empty-paragraphs"
        >
          <u-icon name="file-text" size="60" color="#CCCCCC"></u-icon>
          <text class="empty-text">暂无段落内容</text>
        </view>

        <view v-else class="paragraphs-list">
          <view
            v-for="(paragraph, index) in articleForm.paragraphs"
            :key="index"
            class="paragraph-item"
          >
            <view class="paragraph-header">
              <text class="paragraph-title">段落 {{ index + 1 }}</text>
              <view class="paragraph-actions">
                <u-button
                  v-if="index > 0"
                  type="info"
                  size="mini"
                  @click="moveParagraph(index, 'up')"
                >
                  上移
                </u-button>
                <u-button
                  v-if="index < articleForm.paragraphs.length - 1"
                  type="info"
                  size="mini"
                  @click="moveParagraph(index, 'down')"
                >
                  下移
                </u-button>
                <u-button
                  type="error"
                  size="mini"
                  @click="removeParagraph(index)"
                >
                  删除
                </u-button>
              </view>
            </view>

            <view class="paragraph-content">
              <!-- 文本段落才显示标题输入框 -->
              <u-input
                v-if="paragraph.type !== 'image'"
                v-model="paragraph.title"
                placeholder="请输入段落标题"
                maxlength="100"
                border="none"
                :custom-style="{
                  backgroundColor: '#ffffff',
                  padding: '20rpx',
                  borderRadius: '8rpx',
                  marginBottom: '20rpx',
                }"
              ></u-input>

              <!-- 图片内容 -->
              <view v-if="paragraph.type === 'image'" class="image-content">
                <image
                  :src="paragraph.image_url"
                  class="paragraph-image"
                  mode="aspectFit"
                ></image>
                <view class="image-actions">
                  <u-button
                    type="info"
                    size="mini"
                    @click="rechooseImage(index)"
                    >重新选择</u-button
                  >
                </view>
              </view>

              <!-- 文本内容 -->
              <u-textarea
                v-else
                v-model="paragraph.content"
                placeholder="请输入段落内容"
                border="none"
                :height="120"
                maxlength="2000"
                show-word-limit
              ></u-textarea>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-actions">
      <u-button type="default" @click="goBack" :disabled="saving">
        取消
      </u-button>
      <u-button
        type="primary"
        @click="saveArticle"
        :loading="saving"
        :disabled="!canSave"
      >
        {{ saving ? "保存中..." : "保存文章" }}
      </u-button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      isEdit: false,
      articleId: "",
      saving: false,
      articleForm: {
        title: "",
        description: "",
        cover_image: "",
        sort_order: 0,
        status: "draft",
        paragraphs: [],
      },
    };
  },
  computed: {
    canSave() {
      return this.articleForm.title.trim() !== "";
    },
  },
  onLoad(options) {
    if (options.id) {
      this.isEdit = true;
      this.articleId = options.id;
      this.loadArticle();
    }
  },
  methods: {
    // 返回上一页
    goBack() {
      uni.navigateBack();
    },

    // 加载文章详情
    async loadArticle() {
      try {
        uni.showLoading({ title: "加载中..." });

        const result = await uniCloud.callFunction({
          name: "getArticleDetail",
          data: {
            article_id: this.articleId,
          },
        });

        if (result.result.code === 0) {
          const article = result.result.data.article || result.result.data;
          console.log("加载的文章数据:", article);
          this.articleForm = {
            title: article.title || "",
            description: article.description || "",
            cover_image: article.cover_image || "",
            sort_order: article.sort_order || 0,
            status: article.status || "draft",
            paragraphs: article.paragraphs || [],
          };
        } else {
          uni.showToast({
            title: result.result.message || "加载失败",
            icon: "none",
          });
        }
      } catch (error) {
        console.error("加载文章失败:", error);
        uni.showToast({
          title: "加载失败",
          icon: "none",
        });
      } finally {
        uni.hideLoading();
      }
    },

    // 添加段落
    addParagraph() {
      this.articleForm.paragraphs.push({
        title: "",
        content: "",
        sort_order: this.articleForm.paragraphs.length,
      });
    },

    // 删除段落
    removeParagraph(index) {
      uni.showModal({
        title: "确认删除",
        content: "确定要删除这个段落吗？",
        success: (res) => {
          if (res.confirm) {
            this.articleForm.paragraphs.splice(index, 1);
            // 重新排序
            this.articleForm.paragraphs.forEach((item, idx) => {
              item.sort_order = idx;
            });
          }
        },
      });
    },

    // 删除图片
    removeImage(index) {
      uni.showModal({
        title: "确认删除",
        content: "确定要删除这张图片吗？",
        success: (res) => {
          if (res.confirm) {
            this.articleForm.paragraphs.splice(index, 1);
            // 重新排序
            this.articleForm.paragraphs.forEach((item, idx) => {
              item.sort_order = idx;
            });
          }
        },
      });
    },

    // 重新选择图片
    rechooseImage(index) {
      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: async (res) => {
          try {
            uni.showLoading({ title: "上传中..." });

            // 获取文件后缀名
            const filePath = res.tempFilePaths[0];
            const fileExtension = this.getFileExtension(filePath);

            const uploadPath = `article_images/${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}.${fileExtension}`;

            const extStorage = uniCloud.importObject("ext-storage");
            const uploadOptionsRes = await extStorage.getUploadFileOptions({
              cloudPath: uploadPath,
            });

            // 使用扩展存储上传图片
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

            console.log("图片上传成功", uploadResult);

            // 更新指定索引的图片段落
            this.articleForm.paragraphs[index].image_url =
              uploadOptionsRes.fileURL;

            uni.showToast({
              title: "图片更新成功",
              icon: "success",
            });
          } catch (error) {
            console.error("上传图片失败:", error);
            uni.showToast({
              title: "上传图片失败",
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
    },

    // 移动段落
    moveParagraph(index, direction) {
      const paragraphs = this.articleForm.paragraphs;
      if (direction === "up" && index > 0) {
        [paragraphs[index], paragraphs[index - 1]] = [
          paragraphs[index - 1],
          paragraphs[index],
        ];
      } else if (direction === "down" && index < paragraphs.length - 1) {
        [paragraphs[index], paragraphs[index + 1]] = [
          paragraphs[index + 1],
          paragraphs[index],
        ];
      }
      // 重新排序
      paragraphs.forEach((item, idx) => {
        item.sort_order = idx;
      });
    },

    // 选择封面
    chooseCover() {
      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: async (res) => {
          try {
            uni.showLoading({ title: "上传中..." });

            // 获取文件后缀名
            const filePath = res.tempFilePaths[0];
            const fileExtension = this.getFileExtension(filePath);

            const uploadPath = `article_covers/${Date.now()}_${Math.random()
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
            this.articleForm.cover_image = uploadOptionsRes.fileURL;

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
          console.error("选择封面失败:", err);
          uni.showToast({
            title: "选择封面失败",
            icon: "none",
          });
        },
      });
    },

    // 删除封面
    removeCover() {
      uni.showModal({
        title: "确认删除",
        content: "确定要删除已上传的封面吗？",
        success: (res) => {
          if (res.confirm) {
            this.articleForm.cover_image = "";
          }
        },
      });
    },

    // 添加图片
    addImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: async (res) => {
          try {
            uni.showLoading({ title: "上传中..." });

            // 获取文件后缀名
            const filePath = res.tempFilePaths[0];
            const fileExtension = this.getFileExtension(filePath);

            const uploadPath = `article_images/${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}.${fileExtension}`;

            const extStorage = uniCloud.importObject("ext-storage");
            const uploadOptionsRes = await extStorage.getUploadFileOptions({
              cloudPath: uploadPath,
            });

            // 使用扩展存储上传图片
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

            console.log("图片上传成功", uploadResult);

            // 将图片作为段落添加到文章内容中
            this.articleForm.paragraphs.push({
              title: "图片",
              content: "",
              image_url: uploadOptionsRes.fileURL,
              type: "image",
              sort_order: this.articleForm.paragraphs.length,
            });

            uni.showToast({
              title: "图片上传成功",
              icon: "success",
            });
          } catch (error) {
            console.error("上传图片失败:", error);
            uni.showToast({
              title: "上传图片失败",
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
    },

    // 获取文件后缀名
    getFileExtension(filePath) {
      if (!filePath) return "";
      const parts = filePath.split(".");
      return parts[parts.length - 1] || "";
    },

    // 保存文章
    async saveArticle() {
      if (!this.canSave) {
        uni.showToast({
          title: "请填写文章标题",
          icon: "none",
        });
        return;
      }

      try {
        this.saving = true;

        const functionName = this.isEdit ? "updateArticle" : "createArticle";
        const data = {
          ...this.articleForm,
          sort_order: parseInt(this.articleForm.sort_order) || 0,
        };

        if (this.isEdit) {
          data.article_id = this.articleId;
        }

        const result = await uniCloud.callFunction({
          name: functionName,
          data,
        });

        if (result.result.code === 0) {
          uni.showToast({
            title: this.isEdit ? "更新成功" : "创建成功",
            icon: "success",
          });

          // 延迟返回，让用户看到成功提示
          setTimeout(() => {
            this.goBack();
          }, 1500);
        } else {
          uni.showToast({
            title: result.result.message || "保存失败",
            icon: "none",
          });
        }
      } catch (error) {
        console.error("保存文章失败:", error);
        uni.showToast({
          title: "保存失败",
          icon: "none",
        });
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.article-edit-container {
  height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
  padding-top: 0;
  box-sizing: border-box;
}

.form-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  margin-bottom: 30rpx;
}

.form-card:last-child {
  margin-bottom: 0;
}

.form-section {
  height: calc(100vh - 40rpx - 94rpx - 40px);
  margin-bottom: 30rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

// 操作按钮区域
.action-buttons {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

// 封面上传区域
.cover-upload {
  .upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200rpx;
    background: #f8f9fa;
    border: 2rpx dashed #ddd;
    border-radius: 12rpx;
    cursor: pointer;
    transition: all 0.3s ease;

    &:active {
      background: #e9ecef;
    }

    .upload-text {
      margin-top: 16rpx;
      font-size: 28rpx;
      color: #666;
    }
  }

  .cover-preview {
    position: relative;

    .cover-image {
      width: 100%;
      height: 300rpx;
      border-radius: 12rpx;
      object-fit: cover;
    }

    .cover-actions {
      display: flex;
      gap: 16rpx;
      margin-top: 16rpx;
    }
  }
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
  font-weight: bold;
}

.empty-paragraphs {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 20px;

  .empty-text {
    display: block;
    margin: 15px 0;
    color: #999;
    font-size: 14px;
  }
}

.paragraphs-list {
  .paragraph-item {
    background-color: #fafafa;
    border-radius: 8px;
    margin-bottom: 15px;
    padding: 15px;
  }

  .paragraph-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;

    .paragraph-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    .paragraph-actions {
      display: flex;
      gap: 8px;
    }
  }

  .paragraph-content {
    .u-form-item {
      margin-bottom: 15px;
    }

    .image-content {
      margin-top: 16rpx;

      .paragraph-image {
        width: 100%;
        height: 400rpx;
        border-radius: 12rpx;
        object-fit: cover;
        margin-bottom: 16rpx;
      }

      .image-actions {
        display: flex;
        justify-content: flex-end;
      }
    }
  }
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
