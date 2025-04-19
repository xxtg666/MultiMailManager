'use client';

import { useState, useEffect } from 'react';
import styles from './ProgressBar.module.css';

export default function ProgressBar({ 
  percentage, 
  message, 
  currentAccount,
  currentAccountIndex,
  totalAccounts,
  currentEmailIndex,
  totalEmails
}) {
  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressInfo}>
        {totalAccounts > 1 && (
          <div className={styles.accountProgress}>
            <span>账号进度: {currentAccountIndex}/{totalAccounts}</span>
            {currentAccount && <span>当前账号: {currentAccount}</span>}
          </div>
        )}
        {totalEmails > 0 && (
          <div className={styles.emailProgress}>
            <span>邮件进度: {currentEmailIndex}/{totalEmails}</span>
          </div>
        )}
        <div className={styles.message}>{message}</div>
      </div>
      <div className={styles.progressBarWrapper}>
        <div 
          className={styles.progressBar} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
