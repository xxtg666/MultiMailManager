'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_API_URL, STORAGE_KEYS } from '../config';
import styles from './Settings.module.css';

export default function Settings({ isOpen, onClose }) {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [accessKey, setAccessKey] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1677ff');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.1);

  // 加载设置
  useEffect(() => {
    if (isOpen) {
      // 从localStorage加载设置
      const savedApiUrl = localStorage.getItem(STORAGE_KEYS.API_URL);
      const savedAccessKey = localStorage.getItem(STORAGE_KEYS.ACCESS_KEY);
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);

      if (savedApiUrl) {
        setApiUrl(savedApiUrl);
      }

      if (savedAccessKey) {
        setAccessKey(savedAccessKey);
      }

      if (savedTheme) {
        try {
          const theme = JSON.parse(savedTheme);
          setPrimaryColor(theme.primaryColor || '#1677ff');
          setBackgroundImage(theme.backgroundImage || '');
          setBackgroundOpacity(theme.backgroundOpacity || 0.1);
        } catch (error) {
          console.error('解析主题设置失败:', error);
        }
      }
    }
  }, [isOpen]);

  // 保存设置
  const handleSave = () => {
    // 保存到localStorage
    localStorage.setItem(STORAGE_KEYS.API_URL, apiUrl);
    localStorage.setItem(STORAGE_KEYS.ACCESS_KEY, accessKey);
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify({
      primaryColor,
      backgroundImage,
      backgroundOpacity
    }));

    // 应用主题设置
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    
    if (backgroundImage) {
      document.body.style.backgroundImage = `url(${backgroundImage})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundColor = 'transparent';
      
      // 设置透明度层
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.style.backgroundColor = `rgba(255, 255, 255, ${1 - backgroundOpacity})`;
      }
    } else {
      document.body.style.backgroundImage = 'none';
      document.body.style.backgroundColor = '#f5f5f5';
      
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.style.backgroundColor = 'white';
      }
    }

    // 关闭设置窗口
    onClose();
    
    // 刷新页面以应用新的API URL和访问秘钥
    if (apiUrl !== localStorage.getItem(STORAGE_KEYS.API_URL) || 
        accessKey !== localStorage.getItem(STORAGE_KEYS.ACCESS_KEY)) {
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>设置</h2>
        
        <div className={styles.section}>
          <h3>连接设置</h3>
          <div className={styles.formGroup}>
            <label>后端API地址</label>
            <input 
              type="text" 
              value={apiUrl} 
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="例如: http://localhost:5000"
            />
          </div>
          <div className={styles.formGroup}>
            <label>访问秘钥</label>
            <input 
              type="password" 
              value={accessKey} 
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="留空表示不使用秘钥"
            />
          </div>
        </div>
        
        <div className={styles.section}>
          <h3>个性化设置</h3>
          <div className={styles.formGroup}>
            <label>主题色</label>
            <div className={styles.colorPicker}>
              <input 
                type="color" 
                value={primaryColor} 
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
              <span>{primaryColor}</span>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>背景图片URL</label>
            <input 
              type="text" 
              value={backgroundImage} 
              onChange={(e) => setBackgroundImage(e.target.value)}
              placeholder="留空表示不使用背景图片"
            />
          </div>
          <div className={styles.formGroup}>
            <label>背景图片透明度: {backgroundOpacity}</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={backgroundOpacity} 
              onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
            />
          </div>
        </div>
        
        <div className={styles.buttons}>
          <button className={styles.cancelButton} onClick={onClose}>取消</button>
          <button className={styles.saveButton} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}
