> [!NOTE]
> 本项目完全使用 [manus](https://manus.im/) 编写，我几乎一个字符都没有改。

# MultiMailManager

这是一个基于Python和Next.js开发的邮箱批量登录查询邮件软件，支持多账号管理、邮件收取、搜索和查看功能。

## 功能特点

- **多账号管理**：支持批量添加和管理多个邮箱账号
- **邮件收取**：可以收取单个账号或所有账号的邮件
- **邮件查看**：支持查看邮件详情，包括HTML内容和附件
- **邮件搜索**：可以根据标题或发件人搜索邮件
- **进度显示**：收取邮件和搜索时显示详细进度信息
- **错误通知**：通知系统显示后端处理过程中的错误信息
- **个性化设置**：支持自定义主题色、背景图片等

## 系统要求

- Python 3.6+
- Node.js 14+
- npm 6+

## 安装步骤

### 1. 下载代码

```bash
git clone https://github.com/xxtg666/MultiMailManager.git
cd MultiMailManager
```

### 2. 安装后端依赖

```bash
cd backend
pip install flask flask-cors python-dotenv
```

### 3. 安装前端依赖

```bash
cd ../frontend/email-frontend
npm install --force
```

## 配置说明

### 后端配置

编辑 `backend/config.py` 文件：

```python
# 服务器配置
HOST = "0.0.0.0"  # 监听地址，0.0.0.0表示允许所有IP访问
PORT = 5000       # 监听端口

# 数据存储配置
DATA_DIR = "data"         # 数据存储目录
ACCOUNTS_FILE = "accounts.json"  # 账号配置文件
EMAILS_DIR = "emails"     # 邮件存储目录
ATTACHMENTS_DIR = "attachments"  # 附件存储目录

# 安全配置
ACCESS_KEY = ""  # 访问秘钥，为空表示不需要认证
```

### 前端配置

编辑 `frontend/email-frontend/src/config.js` 文件：

```javascript
// 默认API地址
export const DEFAULT_API_URL = "http://localhost:5000";

// 本地存储键名
export const STORAGE_KEYS = {
  API_URL: "email_query_api_url",
  ACCESS_KEY: "email_query_access_key",
  THEME: "email_query_theme"
};
```

### 账号配置

编辑 `data/accounts.json` 文件：

```json
{
  "server": "imap.example.com",
  "emails": [
    {
      "user": "username@example.com",
      "password": "123456"
    },
    {
      "user": "another@example.com",
      "password": "654321"
    }
  ]
}
```

## 运行应用

### 1. 启动后端服务

```bash
cd backend
python app.py
```

后端服务将在 http://localhost:5000 上运行。

### 2. 启动前端服务

在另一个终端窗口中：

```bash
cd frontend/email-frontend
npm run dev
```

前端界面将在 http://localhost:3000 上运行。

## 使用说明

### 主界面

应用界面分为三个主要部分：
- **工具条**：顶部的搜索框和操作按钮
- **账号列表**：左侧显示所有邮箱账号
- **邮件列表**：右侧显示当前选中账号的邮件

### 收取邮件

- 点击「收取当前选中账号的邮件」按钮收取当前选中账号的邮件
- 点击「收取全部邮件」按钮收取所有账号的邮件
- 收取过程中会显示详细的进度信息

### 查看邮件

- 在右侧邮件列表中点击邮件标题查看详细内容
- 邮件详情包含发件人、标题、发送时间、内容和附件
- 附件可以通过点击下载链接下载

### 搜索邮件

- 在顶部搜索框中输入关键词，按回车或点击搜索按钮
- 搜索结果会显示在右侧邮件列表中
- 搜索过程中会显示进度信息

### 设置选项

点击右上角的设置图标，可以设置：
- 后端API地址
- 访问秘钥
- 主题色
- 背景图片

### 通知系统

点击右上角的通知图标，可以查看系统通知：
- 显示邮件收取过程中的错误信息
- 红色徽标显示错误通知的数量
- 可以清除所有通知

## 故障排除

### 连接问题

- 确保后端API地址正确
- 检查网络连接
- 验证访问秘钥是否正确

### 邮件收取问题

- 确认IMAP服务器地址正确
- 验证邮箱账号和密码
- 检查通知系统中的错误信息

## 开发者信息

如需进一步开发或定制，可以参考以下文件结构：

- `backend/app.py`：后端主应用
- `backend/config.py`：后端配置
- `frontend/email-frontend/src/app/page.tsx`：前端主页面
- `frontend/email-frontend/src/components/`：前端组件
- `frontend/email-frontend/src/config.js`：前端配置
