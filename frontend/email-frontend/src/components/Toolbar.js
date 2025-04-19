'use client';

import { useState } from 'react';
import styles from './Toolbar.module.css';

export default function Toolbar({ onSearch, onFetchCurrent, onFetchAll }) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.logo}>
        邮件查询系统
      </div>
      
      <form className={styles.searchForm} onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="搜索邮件标题或发件人..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchButton}>
          搜索
        </button>
      </form>
      
      <div className={styles.actions}>
        <button 
          onClick={onFetchCurrent} 
          disabled={!onFetchCurrent}
          className={styles.actionButton}
        >
          收取当前账号邮件
        </button>
        <button 
          onClick={onFetchAll}
          className={styles.actionButton}
        >
          收取全部邮件
        </button>
      </div>
    </div>
  );
}
