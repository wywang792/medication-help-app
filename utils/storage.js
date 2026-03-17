/**
 * 本地存储工具类
 */
class StorageUtil {
  /**
   * 获取用户信息
   * @returns {Object|null} 用户信息对象或null
   */
  static getUserInfo() {
    try {
      const userInfo = uni.getStorageSync("userInfo");
      return userInfo || null;
    } catch (error) {
      console.error("获取用户信息失败:", error);
      return null;
    }
  }

  /**
   * 获取用户ID
   * @returns {string|null} 用户ID或null
   */
  static getUserId() {
    try {
      const userInfo = this.getUserInfo();
      return userInfo ? userInfo._id || userInfo.userId : null;
    } catch (error) {
      console.error("获取用户ID失败:", error);
      return null;
    }
  }

  /**
   * 获取token
   * @returns {string|null} token或null
   */
  static getToken() {
    try {
      const token = uni.getStorageSync("token");
      return token || null;
    } catch (error) {
      console.error("获取token失败:", error);
      return null;
    }
  }

  /**
   * 检查是否已登录
   * @returns {boolean} 是否已登录
   */
  static isLoggedIn() {
    const userInfo = this.getUserInfo();
    const token = this.getToken();
    return !!(userInfo && token);
  }

  /**
   * 设置用户信息
   * @param {Object} userInfo 用户信息
   */
  static setUserInfo(userInfo) {
    try {
      uni.setStorageSync("userInfo", userInfo);
    } catch (error) {
      console.error("设置用户信息失败:", error);
    }
  }

  /**
   * 设置token
   * @param {string} token token字符串
   */
  static setToken(token) {
    try {
      uni.setStorageSync("token", token);
    } catch (error) {
      console.error("设置token失败:", error);
    }
  }

  /**
   * 清除所有用户相关数据
   */
  static clearUserData() {
    try {
      uni.removeStorageSync("userInfo");
      uni.removeStorageSync("token");
    } catch (error) {
      console.error("清除用户数据失败:", error);
    }
  }

  /**
   * 获取存储中的数据
   * @param {string} key 键名
   * @param {*} defaultValue 默认值
   * @returns {*} 存储的值或默认值
   */
  static get(key, defaultValue = null) {
    try {
      const value = uni.getStorageSync(key);
      return value !== "" ? value : defaultValue;
    } catch (error) {
      console.error(`获取存储数据失败 [${key}]:`, error);
      return defaultValue;
    }
  }

  /**
   * 设置存储数据
   * @param {string} key 键名
   * @param {*} value 值
   */
  static set(key, value) {
    try {
      uni.setStorageSync(key, value);
    } catch (error) {
      console.error(`设置存储数据失败 [${key}]:`, error);
    }
  }

  /**
   * 删除存储数据
   * @param {string} key 键名
   */
  static remove(key) {
    try {
      uni.removeStorageSync(key);
    } catch (error) {
      console.error(`删除存储数据失败 [${key}]:`, error);
    }
  }

  /**
   * 获取存储中的数据 (getData 别名方法)
   * @param {string} key 键名
   * @param {*} defaultValue 默认值
   * @returns {*} 存储的值或默认值
   */
  static getData(key, defaultValue = null) {
    return this.get(key, defaultValue);
  }

  /**
   * 设置存储数据 (setData 别名方法)
   * @param {string} key 键名
   * @param {*} value 值
   */
  static setData(key, value) {
    return this.set(key, value);
  }
}

export default StorageUtil;
