'use client';

import { useState, useEffect } from 'react';
import EmailList from '../components/EmailList';
import AccountList from '../components/AccountList';
import Toolbar from '../components/Toolbar';
import EmailDetail from '../components/EmailDetail';
import ProgressBar from '../components/ProgressBar';
import Settings from '../components/Settings';
import { DEFAULT_API_URL, STORAGE_KEYS } from '../config';
import styles from './page.module.css';

export default function Home() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showEmailDetail, setShowEmailDetail] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ status: 'idle', percentage: 0, message: '' });
  const [searchProgress, setSearchProgress] = useState({ status: 'idle', percentage: 0, message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);

  // 加载API URL
  useEffect(() => {
    const savedApiUrl = localStorage.getItem(STORAGE_KEYS.API_URL);
    if (savedApiUrl) {
      setApiUrl(savedApiUrl);
    }
    
    // 应用主题设置
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme) {
      try {
        const theme = JSON.parse(savedTheme);
        document.documentElement.style.setProperty('--primary-color', theme.primaryColor || '#1677ff');
        
        if (theme.backgroundImage) {
          document.body.style.backgroundImage = `url(${theme.backgroundImage})`;
          document.body.style.backgroundSize = 'cover';
          document.body.style.backgroundPosition = 'center';
          document.body.style.backgroundRepeat = 'no-repeat';
          document.body.style.backgroundAttachment = 'fixed';
          document.body.style.backgroundColor = 'transparent';
          
          // 设置透明度层
          const mainElement = document.querySelector('main');
          if (mainElement) {
            mainElement.style.backgroundColor = `rgba(255, 255, 255, ${1 - (theme.backgroundOpacity || 0.1)})`;
          }
        }
      } catch (error) {
        console.error('解析主题设置失败:', error);
      }
    }
  }, []);

  // 获取账号列表
  useEffect(() => {
    fetchAccounts();
  }, [apiUrl]);

  // 检查进度状态
  useEffect(() => {
    // 页面加载时检查是否有正在进行的任务
    checkFetchProgress();
    checkSearchProgress();
  }, [apiUrl]);

  // 监听获取邮件进度
  useEffect(() => {
    if (fetchProgress.status === 'fetching') {
      const interval = setInterval(() => {
        checkFetchProgress();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [fetchProgress.status, selectedAccount, apiUrl]);

  // 监听搜索进度
  useEffect(() => {
    if (searchProgress.status === 'searching') {
      const interval = setInterval(() => {
        checkSearchProgress();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [searchProgress.status, searchQuery, apiUrl]);

  // 检查获取邮件进度
  const checkFetchProgress = () => {
    fetch(`${apiUrl}/api/fetch/progress`, {
      headers: getAuthHeaders()
    })
      .then(response => response.json())
      .then(data => {
        setFetchProgress(data);
        if (data.status === 'completed' || data.status === 'error') {
          if (selectedAccount) {
            fetchEmails(selectedAccount);
          } else {
            fetchAllEmails();
          }
          // 更新账号列表以获取最新的邮件数量
          fetchAccounts();
        }
      })
      .catch(error => {
        console.error('获取进度失败:', error);
      });
  };

  // 检查搜索进度
  const checkSearchProgress = () => {
    fetch(`${apiUrl}/api/search/progress`, {
      headers: getAuthHeaders()
    })
      .then(response => response.json())
      .then(data => {
        setSearchProgress(data);
        if (data.status === 'completed') {
          fetchSearchResults(searchQuery);
        }
      })
      .catch(error => {
        console.error('获取搜索进度失败:', error);
      });
  };

  // 获取认证头
  const getAuthHeaders = () => {
    const headers = {};
    const accessKey = localStorage.getItem(STORAGE_KEYS.ACCESS_KEY);
    if (accessKey) {
      headers['Authorization'] = `Bearer ${accessKey}`;
    }
    return headers;
  };

  // 获取账号列表
  const fetchAccounts = () => {
    fetch(`${apiUrl}/api/accounts`, {
      headers: getAuthHeaders()
    })
      .then(response => response.json())
      .then(data => {
        setAccounts(data);
        if (data.emails && data.emails.length > 0) {
          if (!selectedAccount) {
            const firstAccount = data.emails[0].user;
            fetchEmails(firstAccount);
            setSelectedAccount(firstAccount);
          }
        }
      })
      .catch(error => {
        console.error('获取账号列表失败:', error);
      });
  };

  // 获取账号邮件列表
  const fetchEmails = (account) => {
    fetch(`${apiUrl}/api/emails/${account}`, {
      headers: getAuthHeaders()
    })
      .then(response => response.json())
      .then(data => {
        setEmails(data);
        setIsSearching(false);
      })
      .catch(error => {
        console.error('获取邮件列表失败:', error);
      });
  };

  // 获取所有邮件
  const fetchAllEmails = () => {
    fetch(`${apiUrl}/api/emails`, {
      headers: getAuthHeaders()
    })
      .then(response => response.json())
      .then(data => {
        setEmails(data);
      })
      .catch(error => {
        console.error('获取所有邮件失败:', error);
      });
  };

  // 获取邮件详情
  const fetchEmailDetail = (emailId) => {
    fetch(`${apiUrl}/api/email/${emailId}`, {
      headers: getAuthHeaders()
    })
      .then(response => response.json())
      .then(data => {
        setSelectedEmail(data);
        setShowEmailDetail(true);
      })
      .catch(error => {
        console.error('获取邮件详情失败:', error);
      });
  };

  // 获取单个账号的邮件
  const fetchAccountEmails = (account) => {
    setFetchProgress({ status: 'fetching', percentage: 0, message: '正在获取邮件...' });
    fetch(`${apiUrl}/api/fetch/${account}`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // 进度会通过轮询获取
        }
      })
      .catch(error => {
        console.error('获取邮件失败:', error);
        setFetchProgress({ status: 'error', percentage: 0, message: '获取邮件失败' });
      });
  };

  // 获取所有账号的邮件
  const fetchAllAccountsEmails = () => {
    setFetchProgress({ status: 'fetching', percentage: 0, message: '正在获取所有邮件...' });
    fetch(`${apiUrl}/api/fetch/all`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // 进度会通过轮询获取
        }
      })
      .catch(error => {
        console.error('获取所有邮件失败:', error);
        setFetchProgress({ status: 'error', percentage: 0, message: '获取所有邮件失败' });
      });
  };

  // 搜索邮件
  const searchEmails = (query) => {
    if (!query) return;

    setSearchProgress({ status: 'searching', percentage: 0, message: '正在搜索邮件...' });
    setIsSearching(true);
    setSelectedAccount(null);
    
    fetch(`${apiUrl}/api/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders()
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // 进度会通过轮询获取
        }
      })
      .catch(error => {
        console.error('搜索邮件失败:', error);
        setSearchProgress({ status: 'error', percentage: 0, message: '搜索邮件失败' });
      });
  };

  // 获取搜索结果
  const fetchSearchResults = (query) => {
    fetch(`${apiUrl}/api/search/results?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders()
    })
      .then(response => response.json())
      .then(data => {
        setEmails(data);
      })
      .catch(error => {
        console.error('获取搜索结果失败:', error);
      });
  };

  // 选择账号
  const handleSelectAccount = (account) => {
    setSelectedAccount(account);
    setIsSearching(false);
    fetchEmails(account);
  };

  // 选择邮件
  const handleSelectEmail = (email) => {
    fetchEmailDetail(email.id);
  };

  // 关闭邮件详情
  const handleCloseEmailDetail = () => {
    setShowEmailDetail(false);
    setSelectedEmail(null);
  };

  // 处理搜索
  const handleSearch = (query) => {
    setSearchQuery(query);
    searchEmails(query);
  };

  // 打开设置
  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  // 关闭设置
  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  return (
    <main className={styles.main}>
      {/* 设置按钮 */}
      <div className={styles.settingsContainer}>
        <button className={styles.settingsButton} onClick={handleOpenSettings}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>

      {/* 设置弹窗 */}
      <Settings isOpen={showSettings} onClose={handleCloseSettings} />
      
      {/* 工具条 */}
      <Toolbar 
        onSearch={handleSearch} 
        onFetchCurrent={selectedAccount ? () => fetchAccountEmails(selectedAccount) : null} 
        onFetchAll={fetchAllAccountsEmails} 
      />
      
      {/* 进度条 */}
      {(fetchProgress.status === 'fetching' || searchProgress.status === 'searching') && (
        <ProgressBar 
          percentage={fetchProgress.status === 'fetching' ? fetchProgress.percentage : searchProgress.percentage} 
          message={fetchProgress.status === 'fetching' ? fetchProgress.message : searchProgress.message} 
          currentAccount={fetchProgress.current_account}
          currentAccountIndex={fetchProgress.current_account_index}
          totalAccounts={fetchProgress.total_accounts}
          currentEmailIndex={fetchProgress.current_email_index}
          totalEmails={fetchProgress.total_emails}
        />
      )}
      
      <div className={styles.container}>
        {/* 账号列表 */}
        <div className={styles.accountListContainer}>
          <AccountList 
            accounts={accounts.emails || []} 
            selectedAccount={selectedAccount} 
            onSelectAccount={handleSelectAccount} 
          />
        </div>
        
        {/* 邮件列表 */}
        <div className={styles.emailListContainer}>
          <EmailList 
            emails={emails} 
            onSelectEmail={handleSelectEmail} 
            isSearching={isSearching}
          />
        </div>
      </div>
      
      {/* 邮件详情 */}
      {showEmailDetail && selectedEmail && (
        <EmailDetail 
          email={selectedEmail} 
          onClose={handleCloseEmailDetail} 
          apiUrl={apiUrl}
          authHeaders={getAuthHeaders()}
        />
      )}
    </main>
  );
}
