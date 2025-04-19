'use client';

import { useState } from 'react';
import styles from './AccountList.module.css';

export default function AccountList({ accounts, selectedAccount, onSelectAccount }) {
  return (
    <div className={styles.accountList}>
      {accounts.map((account) => (
        <div 
          key={account.user}
          className={`${styles.accountItem} ${selectedAccount === account.user ? styles.selected : ''}`}
          onClick={() => onSelectAccount(account.user)}
        >
          <div className={styles.accountName}>{account.user}</div>
          <div className={styles.emailCount}>{account.email_count || 0}</div>
        </div>
      ))}
    </div>
  );
}
