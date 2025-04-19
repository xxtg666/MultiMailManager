'use client';

import { useState } from 'react';
import styles from './EmailList.module.css';

export default function EmailList({ emails, onSelectEmail, isSearching }) {
  return (
    <div className={styles.emailList}>
      {isSearching && (
        <div className={styles.searchResults}>
          搜索结果: 找到 {emails.length} 封邮件
        </div>
      )}
      
      {emails.length > 0 ? (
        emails.map((email) => (
          <div 
            key={email.id}
            className={styles.emailItem}
            onClick={() => onSelectEmail(email)}
          >
            <div className={styles.emailInfo}>
              <div className={styles.emailSubject}>{email.subject}</div>
              <div className={styles.emailSender}>{email.from}</div>
            </div>
            <div className={styles.emailDate}>{email.date}</div>
          </div>
        ))
      ) : (
        <div className={styles.noEmails}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <p>没有邮件</p>
        </div>
      )}
    </div>
  );
}
