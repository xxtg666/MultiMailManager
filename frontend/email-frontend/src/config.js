/**
 * 前端配置文件
 */

// 默认后端API地址
export const DEFAULT_API_URL = 'http://localhost:5000';

// 默认端口号
export const DEFAULT_PORT = 3000;

// 默认主题设置
export const DEFAULT_THEME = {
  // 主题色（小圆点和进度条颜色）
  primaryColor: '#1677ff',
  // 背景图片URL
  backgroundImage: '',
  // 背景图片透明度 (0-1)
  backgroundOpacity: 0.1,
};

// 本地存储键名
export const STORAGE_KEYS = {
  API_URL: 'email_app_api_url',
  ACCESS_KEY: 'email_app_access_key',
  THEME: 'email_app_theme',
};
