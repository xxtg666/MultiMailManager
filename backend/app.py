from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import imaplib
import email
from email.header import decode_header
import time
from datetime import datetime
import re
import base64
import uuid
import threading
import config

app = Flask(__name__)
CORS(app, supports_credentials=True, expose_headers=['Authorization'], allow_headers=['Authorization', 'Content-Type'])

# 配置文件和数据目录
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), config.DATA_DIR)
ACCOUNTS_FILE = os.path.join(DATA_DIR, config.ACCOUNTS_FILE)
EMAILS_DIR = os.path.join(DATA_DIR, config.EMAILS_DIR)
ATTACHMENTS_DIR = os.path.join(DATA_DIR, config.ATTACHMENTS_DIR)
NOTIFICATIONS_FILE = os.path.join(DATA_DIR, 'notifications.json')

# 确保目录存在
os.makedirs(EMAILS_DIR, exist_ok=True)
os.makedirs(ATTACHMENTS_DIR, exist_ok=True)
os.makedirs(os.path.dirname(NOTIFICATIONS_FILE), exist_ok=True)

# 全局变量用于跟踪进度
fetch_progress = {
    'status': 'idle',
    'current_account': '',
    'total_accounts': 0,
    'current_account_index': 0,
    'current_email_index': 0,
    'total_emails': 0,
    'message': '',
    'percentage': 0
}

search_progress = {
    'status': 'idle',
    'message': '',
    'percentage': 0,
    'total_emails': 0,
    'processed_emails': 0
}

# 通知系统
def get_notifications():
    if not os.path.exists(NOTIFICATIONS_FILE):
        with open(NOTIFICATIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
        return []
    
    try:
        with open(NOTIFICATIONS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def add_notification(message, type='info'):
    notifications = get_notifications()
    notifications.append({
        'message': message,
        'type': type,
        'time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })
    
    # 最多保留100条通知
    if len(notifications) > 100:
        notifications = notifications[-100:]
    
    try:
        with open(NOTIFICATIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(notifications, f, ensure_ascii=False, indent=2)
    except:
        pass

def clear_notifications():
    try:
        with open(NOTIFICATIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
    except:
        pass

# 辅助函数：验证访问秘钥
def verify_access_key():
    if not config.ACCESS_KEY:
        return True
    
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return False
    
    try:
        key_type, key = auth_header.split(' ', 1)
        if key_type.lower() != 'bearer':
            return False
        
        return key == config.ACCESS_KEY
    except:
        return False

# 辅助函数：解码邮件主题
def decode_email_subject(subject):
    if subject is None:
        return ""
    decoded_list = decode_header(subject)
    result = ""
    for content, encoding in decoded_list:
        if isinstance(content, bytes):
            try:
                if encoding:
                    result += content.decode(encoding)
                else:
                    result += content.decode('utf-8', errors='replace')
            except:
                result += content.decode('utf-8', errors='replace')
        else:
            result += str(content)
    return result

# 辅助函数：解码邮件内容
def get_email_content(msg):
    content = ""
    html_content = None
    
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            
            if "attachment" not in content_disposition:
                if content_type == "text/plain":
                    try:
                        charset = part.get_content_charset() or 'utf-8'
                        content = part.get_payload(decode=True).decode(charset, errors='replace')
                    except:
                        content = part.get_payload(decode=True).decode('utf-8', errors='replace')
                elif content_type == "text/html":
                    try:
                        charset = part.get_content_charset() or 'utf-8'
                        html_content = part.get_payload(decode=True).decode(charset, errors='replace')
                    except:
                        html_content = part.get_payload(decode=True).decode('utf-8', errors='replace')
    else:
        content_type = msg.get_content_type()
        if content_type == "text/plain":
            try:
                charset = msg.get_content_charset() or 'utf-8'
                content = msg.get_payload(decode=True).decode(charset, errors='replace')
            except:
                content = msg.get_payload(decode=True).decode('utf-8', errors='replace')
        elif content_type == "text/html":
            try:
                charset = msg.get_content_charset() or 'utf-8'
                html_content = msg.get_payload(decode=True).decode(charset, errors='replace')
            except:
                html_content = msg.get_payload(decode=True).decode('utf-8', errors='replace')
    
    # 优先返回HTML内容
    return html_content if html_content else content

# 辅助函数：保存附件
def save_attachments(msg, email_id):
    attachments = []
    email_attachment_dir = os.path.join(ATTACHMENTS_DIR, email_id)
    os.makedirs(email_attachment_dir, exist_ok=True)
    
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_maintype() == 'multipart':
                continue
            
            filename = part.get_filename()
            if filename:
                # 解码文件名
                filename_parts = decode_header(filename)
                filename = ""
                for content, encoding in filename_parts:
                    if isinstance(content, bytes):
                        try:
                            if encoding:
                                filename += content.decode(encoding)
                            else:
                                filename += content.decode('utf-8', errors='replace')
                        except:
                            filename += content.decode('utf-8', errors='replace')
                    else:
                        filename += str(content)
                
                # 确保文件名安全
                filename = re.sub(r'[^\w\.-]', '_', filename)
                
                # 保存附件
                file_path = os.path.join(email_attachment_dir, filename)
                with open(file_path, 'wb') as f:
                    f.write(part.get_payload(decode=True))
                
                attachments.append({
                    'filename': filename,
                    'path': f'/api/attachments/{email_id}/{filename}'
                })
    
    return attachments

# 辅助函数：获取邮件发送时间
def get_email_date(msg):
    date_str = msg.get('Date')
    if not date_str:
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    try:
        # 尝试解析各种日期格式
        date_formats = [
            '%a, %d %b %Y %H:%M:%S %z',
            '%a, %d %b %Y %H:%M:%S %Z',
            '%d %b %Y %H:%M:%S %z',
            '%d %b %Y %H:%M:%S %Z',
            '%a, %d %b %Y %H:%M:%S',
            '%d %b %Y %H:%M:%S'
        ]
        
        for fmt in date_formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime('%Y-%m-%d %H:%M:%S')
            except:
                continue
        
        # 如果所有格式都失败，使用简单的正则表达式提取日期部分
        match = re.search(r'\d{1,2}\s+\w{3}\s+\d{4}\s+\d{1,2}:\d{1,2}:\d{1,2}', date_str)
        if match:
            date_part = match.group(0)
            dt = datetime.strptime(date_part, '%d %b %Y %H:%M:%S')
            return dt.strftime('%Y-%m-%d %H:%M:%S')
        
        return date_str
    except:
        return date_str

# 辅助函数：检查邮件是否已存在
def is_email_exists(account, subject, date):
    account_dir = os.path.join(EMAILS_DIR, account)
    if not os.path.exists(account_dir):
        return False
    
    for filename in os.listdir(account_dir):
        if filename.endswith('.json'):
            try:
                with open(os.path.join(account_dir, filename), 'r', encoding='utf-8') as f:
                    email_data = json.load(f)
                    if email_data.get('subject') == subject and email_data.get('date') == date:
                        return True
            except:
                continue
    
    return False

# 辅助函数：获取账号列表
def get_accounts():
    if not os.path.exists(ACCOUNTS_FILE):
        return {"server": "", "emails": []}
    
    try:
        with open(ACCOUNTS_FILE, 'r', encoding='utf-8') as f:
            accounts_data = json.load(f)
            # 添加邮件数量信息
            for email_data in accounts_data.get('emails', []):
                account = email_data.get('user', '')
                email_data['email_count'] = get_account_email_count(account)
            return accounts_data
    except:
        return {"server": "", "emails": []}

# 辅助函数：获取账号邮件数量
def get_account_email_count(account):
    account_dir = os.path.join(EMAILS_DIR, account)
    if not os.path.exists(account_dir):
        return 0
    
    return len([f for f in os.listdir(account_dir) if f.endswith('.json')])

# 辅助函数：获取账号邮件列表
def get_account_emails(account):
    account_dir = os.path.join(EMAILS_DIR, account)
    if not os.path.exists(account_dir):
        return []
    
    emails = []
    for filename in os.listdir(account_dir):
        if filename.endswith('.json'):
            try:
                with open(os.path.join(account_dir, filename), 'r', encoding='utf-8') as f:
                    email_data = json.load(f)
                    emails.append(email_data)
            except:
                continue
    
    # 按日期排序，最新的在前面
    emails.sort(key=lambda x: x.get('date', ''), reverse=True)
    return emails

# 辅助函数：搜索邮件
def search_emails(query):
    global search_progress
    
    search_progress = {
        'status': 'searching',
        'message': '正在搜索邮件...',
        'percentage': 0,
        'total_emails': 0,
        'processed_emails': 0
    }
    
    results = []
    query = query.lower()
    
    # 获取所有账号
    accounts_data = get_accounts()
    all_accounts = [email['user'] for email in accounts_data.get('emails', [])]
    
    # 计算总邮件数
    total_emails = 0
    for account in all_accounts:
        account_dir = os.path.join(EMAILS_DIR, account)
        if os.path.exists(account_dir):
            total_emails += len([f for f in os.listdir(account_dir) if f.endswith('.json')])
    
    search_progress['total_emails'] = total_emails
    processed_emails = 0
    
    # 搜索每个账号的邮件
    for account in all_accounts:
        account_dir = os.path.join(EMAILS_DIR, account)
        if not os.path.exists(account_dir):
            continue
        
        for filename in os.listdir(account_dir):
            if filename.endswith('.json'):
                try:
                    with open(os.path.join(account_dir, filename), 'r', encoding='utf-8') as f:
                        email_data = json.load(f)
                        
                        # 检查标题和发件人
                        subject = email_data.get('subject', '').lower()
                        sender = email_data.get('from', '').lower()
                        
                        if query in subject or query in sender:
                            results.append(email_data)
                except:
                    continue
                
                processed_emails += 1
                search_progress['processed_emails'] = processed_emails
                search_progress['percentage'] = int(processed_emails / total_emails * 100) if total_emails > 0 else 100
    
    # 按日期排序，最新的在前面
    results.sort(key=lambda x: x.get('date', ''), reverse=True)
    
    search_progress = {
        'status': 'completed',
        'message': f'搜索完成，找到 {len(results)} 封邮件',
        'percentage': 100,
        'total_emails': total_emails,
        'processed_emails': total_emails
    }
    
    return results

# 辅助函数：获取邮件详情
def get_email_detail(email_id):
    for account_dir in os.listdir(EMAILS_DIR):
        account_path = os.path.join(EMAILS_DIR, account_dir)
        if os.path.isdir(account_path):
            email_file = os.path.join(account_path, f"{email_id}.json")
            if os.path.exists(email_file):
                try:
                    with open(email_file, 'r', encoding='utf-8') as f:
                        return json.load(f)
                except:
                    return None
    
    return None

# 辅助函数：获取所有邮件
def get_all_emails():
    all_emails = []
    
    for account_dir in os.listdir(EMAILS_DIR):
        account_path = os.path.join(EMAILS_DIR, account_dir)
        if os.path.isdir(account_path):
            for filename in os.listdir(account_path):
                if filename.endswith('.json'):
                    try:
                        with open(os.path.join(account_path, filename), 'r', encoding='utf-8') as f:
                            email_data = json.load(f)
                            all_emails.append(email_data)
                    except:
                        continue
    
    # 按日期排序，最新的在前面
    all_emails.sort(key=lambda x: x.get('date', ''), reverse=True)
    return all_emails

# 辅助函数：更新账号邮件数量
def update_account_email_count(account):
    accounts_data = get_accounts()
    for email_data in accounts_data.get('emails', []):
        if email_data.get('user', '') == account:
            email_data['email_count'] = get_account_email_count(account)
            break
    
    return accounts_data

# 辅助函数：获取单个账号的邮件
def fetch_account_emails(server, account, password):
    global fetch_progress
    
    account_dir = os.path.join(EMAILS_DIR, account)
    os.makedirs(account_dir, exist_ok=True)
    
    fetch_progress['current_account'] = account
    fetch_progress['message'] = f'正在连接到邮件服务器 {server}...'
    
    try:
        # 连接到IMAP服务器
        mail = imaplib.IMAP4_SSL(server)
        mail.login(account, password)
        mail.select('INBOX')
        
        # 获取所有邮件
        status, messages = mail.search(None, 'ALL')
        email_ids = messages[0].split()
        
        fetch_progress['total_emails'] = len(email_ids)
        fetch_progress['message'] = f'找到 {len(email_ids)} 封邮件，开始下载...'
        
        # 从最新的邮件开始处理
        email_ids.reverse()
        
        for i, email_id in enumerate(email_ids):
            fetch_progress['current_email_index'] = i + 1
            fetch_progress['percentage'] = int((i + 1) / len(email_ids) * 100)
            fetch_progress['message'] = f'正在处理第 {i + 1}/{len(email_ids)} 封邮件...'
            
            try:
                # 获取邮件内容
                status, msg_data = mail.fetch(email_id, '(RFC822)')
                
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        
                        # 获取邮件信息
                        subject = decode_email_subject(msg['Subject'])
                        sender = msg['From']
                        date = get_email_date(msg)
                        
                        # 检查邮件是否已存在
                        if is_email_exists(account, subject, date):
                            fetch_progress['message'] = f'跳过已存在的邮件: {subject}'
                            continue
                        
                        # 生成唯一ID
                        email_uuid = str(uuid.uuid4())
                        
                        # 获取邮件内容
                        content = get_email_content(msg)
                        
                        # 保存附件
                        attachments = save_attachments(msg, email_uuid)
                        
                        # 保存邮件数据
                        email_data = {
                            'id': email_uuid,
                            'account': account,
                            'subject': subject,
                            'from': sender,
                            'date': date,
                            'content': content,
                            'attachments': attachments
                        }
                        
                        with open(os.path.join(account_dir, f"{email_uuid}.json"), 'w', encoding='utf-8') as f:
                            json.dump(email_data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                error_msg = f'处理邮件时出错: {str(e)}'
                fetch_progress['message'] = error_msg
                add_notification(f'账号 {account} 处理邮件时出错: {str(e)}', 'error')
                # 继续处理下一封邮件，不中断整个过程
                continue
        
        mail.close()
        mail.logout()
        
        # 更新账号邮件数量
        accounts_data = update_account_email_count(account)
        
        # 设置状态为已完成
        fetch_progress['status'] = 'completed'
        fetch_progress['message'] = f'账号 {account} 邮件获取完成'
        fetch_progress['percentage'] = 100
        
        return True
    except Exception as e:
        error_msg = f'获取邮件失败: {str(e)}'
        fetch_progress['message'] = error_msg
        fetch_progress['status'] = 'error'
        add_notification(f'账号 {account} 获取邮件失败: {str(e)}', 'error')
        
        # 3秒后自动重置状态
        def reset_status():
            global fetch_progress
            time.sleep(3)
            fetch_progress = {
                'status': 'idle',
                'current_account': '',
                'total_accounts': 0,
                'current_account_index': 0,
                'current_email_index': 0,
                'total_emails': 0,
                'message': '',
                'percentage': 0
            }
        
        threading.Thread(target=reset_status).start()
        return False

# 辅助函数：获取所有账号的邮件
def fetch_all_emails():
    global fetch_progress
    
    fetch_progress = {
        'status': 'fetching',
        'current_account': '',
        'total_accounts': 0,
        'current_account_index': 0,
        'current_email_index': 0,
        'total_emails': 0,
        'message': '正在准备获取邮件...',
        'percentage': 0
    }
    
    # 获取账号列表
    accounts_data = get_accounts()
    server = accounts_data.get('server', '')
    emails = accounts_data.get('emails', [])
    
    fetch_progress['total_accounts'] = len(emails)
    
    if not server or not emails:
        fetch_progress = {
            'status': 'error',
            'message': '没有找到账号信息',
            'percentage': 0
        }
        add_notification('没有找到账号信息', 'error')
        
        # 3秒后自动重置状态
        def reset_status():
            global fetch_progress
            time.sleep(3)
            fetch_progress = {
                'status': 'idle',
                'current_account': '',
                'total_accounts': 0,
                'current_account_index': 0,
                'current_email_index': 0,
                'total_emails': 0,
                'message': '',
                'percentage': 0
            }
        
        threading.Thread(target=reset_status).start()
        return
    
    # 获取每个账号的邮件
    for i, email_data in enumerate(emails):
        account = email_data.get('user', '')
        password = email_data.get('password', '')
        
        fetch_progress['current_account_index'] = i + 1
        fetch_progress['percentage'] = int((i + 1) / len(emails) * 100)
        
        try:
            fetch_account_emails(server, account, password)
        except Exception as e:
            error_msg = f'账号 {account} 获取邮件失败: {str(e)}'
            add_notification(error_msg, 'error')
            # 继续处理下一个账号，不中断整个过程
            continue
        
        # 更新账号邮件数量
        email_data['email_count'] = get_account_email_count(account)
    
    fetch_progress = {
        'status': 'completed',
        'message': '所有邮件获取完成',
        'percentage': 100
    }
    
    # 5秒后自动重置状态
    def reset_status():
        global fetch_progress
        time.sleep(5)
        fetch_progress = {
            'status': 'idle',
            'current_account': '',
            'total_accounts': 0,
            'current_account_index': 0,
            'current_email_index': 0,
            'total_emails': 0,
            'message': '',
            'percentage': 0
        }
    
    threading.Thread(target=reset_status).start()

# API路由：获取账号列表
@app.route('/api/accounts', methods=['GET'])
def api_get_accounts():
    if not verify_access_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    return jsonify(get_accounts())

# API路由：获取账号邮件列表
@app.route('/api/emails/<account>', methods=['GET'])
def api_get_account_emails(account):
    if not verify_access_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    return jsonify(get_account_emails(account))

# API路由：获取所有邮件
@app.route('/api/emails', methods=['GET'])
def api_get_all_emails():
    if not verify_access_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    return jsonify(get_all_emails())

# API路由：获取邮件详情
@app.route('/api/email/<email_id>', methods=['GET'])
def api_get_email_detail(email_id):
    if not verify_access_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    email_data = get_email_detail(email_id)
    if email_data:
        return jsonify(email_data)
    else:
        return jsonify({'error': 'Email not found'}), 404

# API路由：获取附件
@app.route('/api/attachments/<email_id>/<filename>', methods=['GET'])
def api_get_attachment(email_id, filename):
    if not verify_access_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    file_path = os.path.join(ATTACHMENTS_DIR, email_id, filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True, download_name=filename)
    else:
        return jsonify({'error': 'Attachment not found'}), 404

# API路由：获取单个账号的邮件
@app.route('/api/fetch/<account>', methods=['POST'])
def api_fetch_account_emails(account):
    if not verify_access_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    global fetch_progress
    
    # 如果已经在获取邮件，则返回错误
    if fetch_progress['status'] == 'fetching':
        return jsonify({'error': '正在获取邮件，请稍后再试'}), 400
    
    # 获取账号信息
    accounts_data = get_accounts()
    server = accounts_data.get('server', '')
    emails = accounts_data.get('emails', [])
    
    # 查找账号
    account_data = None
    for email_data in emails:
        if email_data.get('user', '') == account:
            account_data = email_data
            break
    
    if not server or not account_data:
        return jsonify({'error': 'Account not found'}), 404
    
    # 设置进度信息
    fetch_progress = {
        'status': 'fetching',
        'current_account': account,
        'total_accounts': 1,
        'current_account_index': 1,
        'current_email_index': 0,
        'total_emails': 0,
        'message': '正在准备获取邮件...',
        'percentage': 0
    }
    
    # 启动异步任务获取邮件
    threading.Thread(target=fetch_account_emails, args=(server, account, account_data.get('password', ''))).start()
    
    return jsonify({'success': True})

# API路由：获取所有账号的邮件
@app.route('/api/fetch/all', methods=['POST'])
def api_fetch_all_emails():
    if not verify_access_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    global fetch_progress
    
    # 如果已经在获取邮件，则返回错误
    if fetch_progress['status'] == 'fetching':
        return jsonify({'error': '正在获取邮件，请稍后再试'}), 400
    
    # 启动异步任务获取所有邮件
    threading.Thread(target=fetch_all_emails).start()
    
    return jsonify({'success': True})

# API路由：获取获取邮件进度
@app.route('/api/fetch/progress', methods=['GET'])
def api_get_fetch_progress():
    if not verify_access_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    return jsonify(fetch_progress)

# API路由：搜索邮件
@app.route('/api/search', methods=['GET'])
def api_search_emails():
    if not verify_access_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': 'Query parameter is required'}), 400
    
    # 启动异步任务搜索邮件
    threading.Thread(target=search_emails, args=(query,)).start()
    
    return jsonify({'success': True})

# API路由：获取搜索进度
@app.route('/api/search/progress', methods=['GET'])
def api_get_search_progress():
    if not verify_access_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    return jsonify(search_progress)

# API路由：获取搜索结果
@app.route('/api/search/results', methods=['GET'])
def api_get_search_results():
    if not verify_access_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': 'Query parameter is required'}), 400
    
    if search_progress['status'] != 'completed':
        return jsonify([])
    
    return jsonify(search_emails(query))

# API路由：获取通知
@app.route('/api/notifications', methods=['GET'])
def api_get_notifications():
    if not verify_access_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    return jsonify(get_notifications())

# API路由：清除通知
@app.route('/api/notifications/clear', methods=['POST'])
def api_clear_notifications():
    if not verify_access_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    clear_notifications()
    return jsonify({'success': True})

# 健康检查
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host=config.HOST, port=config.PORT)
