"""
后端配置文件
"""

# 服务器配置
HOST = '0.0.0.0'  # 监听所有网络接口
PORT = 5000       # 服务器端口

# 安全配置
ACCESS_KEY = ''   # 访问秘钥，为空表示不需要验证

# 数据存储配置
DATA_DIR = 'data'                # 数据目录
ACCOUNTS_FILE = 'accounts.json'  # 账号配置文件
EMAILS_DIR = 'emails'            # 邮件存储目录
ATTACHMENTS_DIR = 'attachments'  # 附件存储目录
