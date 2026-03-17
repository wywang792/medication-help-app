/**
 * 日期时间格式化工具类
 */

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {number|string} timestamp - 时间戳
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * 格式化时间为 HH:MM 格式
 * @param {number|string} timestamp - 时间戳
 * @returns {string} 格式化后的时间字符串
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

/**
 * 格式化完整日期时间为 YYYY-MM-DD HH:MM 格式
 * @param {number|string} timestamp - 时间戳
 * @returns {string} 格式化后的完整日期时间字符串
 */
export const formatDateTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

/**
 * 格式化相对时间（今天显示时间，昨天显示"昨天 时间"，其他显示"MM-DD 时间"）
 * @param {number|string} timestamp - 时间戳
 * @returns {string} 格式化后的相对时间字符串
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  // 如果是今天
  if (diff < 24 * 60 * 60 * 1000) {
    return `${hours}:${minutes}`;
  }
  // 如果是昨天
  if (diff < 48 * 60 * 60 * 1000) {
    return `昨天 ${hours}:${minutes}`;
  }
  // 其他日期
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day} ${hours}:${minutes}`;
};
