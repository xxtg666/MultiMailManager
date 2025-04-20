'use client';

import styles from './EmailDetail.module.css';
import { useEffect, useState } from 'react';
import { STORAGE_KEYS, DEFAULT_API_URL } from '../config';

export default function EmailDetail({ email, onClose }) {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);

  useEffect(() => {
    // 从本地存储获取API地址
    const storedApiUrl = localStorage.getItem(STORAGE_KEYS.API_URL);
    if (storedApiUrl) {
      setApiUrl(storedApiUrl);
    }
  }, []);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.subject}>{email.subject || '(无主题)'}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.metadata}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>发件人：</span>
            <span className={styles.metaValue}>{email.from || '未知发件人'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>时间：</span>
            <span className={styles.metaValue}>{formatDate(email.date)}</span>
          </div>
        </div>
        
        <div className={styles.content}>
          {email.content ? (
            <div dangerouslySetInnerHTML={{ __html: email.content }} />
          ) : (
            <div className={styles.emptyContent}>(无内容)</div>
          )}
        </div>
        
        {email.attachments && email.attachments.length > 0 && (
          <div className={styles.attachments}>
            <h3 className={styles.attachmentsTitle}>附件</h3>
            <div className={styles.attachmentsList}>
              {email.attachments.map((attachment, index) => (
                <a 
                  key={index}
                  href={`${apiUrl}${attachment.path}`}
                  className={styles.attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={styles.attachmentIcon}>📎</span>
                  <span className={styles.attachmentName}>{attachment.filename}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
