from flask import Flask, request, jsonify, send_from_directory, render_template_string, abort
from flask_cors import CORS
import pymysql
import os
import logging
from datetime import datetime, timedelta
import logging
from dotenv import load_dotenv
import random
import requests
import json
from functools import wraps
from collections import defaultdict
import time

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# 安全配置
SECURITY_CONFIG = {
    'RATE_LIMIT_REQUESTS': int(os.getenv('RATE_LIMIT_REQUESTS', 10)),  # 每分钟最大请求数
    'RATE_LIMIT_WINDOW': int(os.getenv('RATE_LIMIT_WINDOW', 60)),      # 时间窗口（秒）
    'BAN_THRESHOLD': int(os.getenv('BAN_THRESHOLD', 100)),             # 触发封禁的请求数
    'BAN_WINDOW': int(os.getenv('BAN_WINDOW', 300)),                   # 检测时间窗口（秒）
    'BAN_DURATION': int(os.getenv('BAN_DURATION', 3600)),              # 封禁时长（秒）
    'WHITELIST_IPS': os.getenv('WHITELIST_IPS', '127.0.0.1,::1').split(',')  # 白名单IP
}

# 内存中的请求计数器（用于快速检查）
request_counts = defaultdict(list)
blocked_ips = {}

# MySQL 数据库配置
MYSQL_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'port': int(os.getenv('MYSQL_PORT', 3306)),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASSWORD', ''),
    'database': os.getenv('MYSQL_DATABASE', 'birthday_board'),
    'charset': 'utf8mb4',
    'autocommit': True
}

def get_db_connection():
    """获取数据库连接"""
    try:
        connection = pymysql.connect(**MYSQL_CONFIG)
        return connection
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        raise

def init_database():
    """初始化数据库和表结构"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 创建统一的活动记录表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activity_logs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                activity_type ENUM('message', 'visit') NOT NULL COMMENT '活动类型：留言或访问',
                
                -- 留言相关字段
                name VARCHAR(100) NULL COMMENT '留言者姓名',
                message TEXT NULL COMMENT '留言内容',
                emoji VARCHAR(10) DEFAULT '🎂' COMMENT '表情符号',
                
                -- 访问信息字段
                ip_address VARCHAR(45) NOT NULL COMMENT 'IP地址 (支持IPv6)',
                user_agent TEXT NULL COMMENT '用户代理信息',
                referer VARCHAR(500) NULL COMMENT '来源页面',
                
                -- 时间和位置信息
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                country VARCHAR(50) NULL COMMENT '国家',
                city VARCHAR(100) NULL COMMENT '城市',
                
                -- 索引
                INDEX idx_activity_type (activity_type),
                INDEX idx_ip_address (ip_address),
                INDEX idx_created_at (created_at),
                INDEX idx_type_time (activity_type, created_at)
            ) ENGINE=InnoDB 
              DEFAULT CHARSET=utf8mb4 
              COLLATE=utf8mb4_unicode_ci 
              COMMENT='活动日志表：记录留言和访问信息'
        ''')
        
        # 创建红包口令表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS red_packet_codes (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE COMMENT '支付宝口令红包代码',
                description VARCHAR(200) NULL COMMENT '红包描述',
                amount DECIMAL(10,2) NULL COMMENT '红包金额',
                is_used BOOLEAN DEFAULT FALSE COMMENT '是否已使用',
                used_by_ip VARCHAR(45) NULL COMMENT '使用者IP',
                used_at TIMESTAMP NULL COMMENT '使用时间',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                
                INDEX idx_is_used (is_used),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB 
              DEFAULT CHARSET=utf8mb4 
              COLLATE=utf8mb4_unicode_ci 
              COMMENT='红包口令表：管理支付宝红包口令'
        ''')
        
        # 创建IP封禁表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ip_bans (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                ip_address VARCHAR(45) NOT NULL UNIQUE COMMENT 'IP地址',
                ban_reason VARCHAR(200) DEFAULT 'Rate limit exceeded' COMMENT '封禁原因',
                ban_count INT DEFAULT 1 COMMENT '封禁次数',
                banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '封禁时间',
                expires_at TIMESTAMP NOT NULL COMMENT '解封时间',
                is_permanent BOOLEAN DEFAULT FALSE COMMENT '是否永久封禁',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                
                INDEX idx_ip_address (ip_address),
                INDEX idx_expires_at (expires_at),
                INDEX idx_is_permanent (is_permanent)
            ) ENGINE=InnoDB 
              DEFAULT CHARSET=utf8mb4 
              COLLATE=utf8mb4_unicode_ci 
              COMMENT='IP封禁表：管理被封禁的IP地址'
        ''')
        
        # 创建请求日志表（用于详细的安全分析）
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS request_logs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                ip_address VARCHAR(45) NOT NULL COMMENT 'IP地址',
                endpoint VARCHAR(200) NOT NULL COMMENT '请求端点',
                method VARCHAR(10) NOT NULL COMMENT 'HTTP方法',
                user_agent TEXT NULL COMMENT '用户代理',
                status_code INT NULL COMMENT '响应状态码',
                response_time FLOAT NULL COMMENT '响应时间(ms)',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '请求时间',
                
                INDEX idx_ip_address (ip_address),
                INDEX idx_endpoint (endpoint),
                INDEX idx_created_at (created_at),
                INDEX idx_ip_time (ip_address, created_at)
            ) ENGINE=InnoDB 
              DEFAULT CHARSET=utf8mb4 
              COLLATE=utf8mb4_unicode_ci 
              COMMENT='请求日志表：记录所有API请求用于安全分析'
        ''')
        
        conn.commit()
        conn.close()
        logger.info("MySQL数据库初始化完成")
        
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        raise

def get_client_ip():
    """获取客户端IP地址"""
    if request.environ.get('HTTP_X_FORWARDED_FOR') is None:
        return request.environ['REMOTE_ADDR']
    else:
        return request.environ['HTTP_X_FORWARDED_FOR']

def get_ip_location(ip_address):
    """获取IP地址的地理位置信息"""
    try:
        # 使用免费的IP地理位置API
        response = requests.get(f'http://ip-api.com/json/{ip_address}?lang=zh-CN', timeout=3)
        if response.status_code == 200:
            data = response.json()
            if data['status'] == 'success':
                return {
                    'country': data.get('country', ''),
                    'region': data.get('regionName', ''),
                    'city': data.get('city', ''),
                    'isp': data.get('isp', '')
                }
    except Exception as e:
        logger.error(f"获取IP位置信息失败: {e}")
    
    return {'country': '', 'region': '', 'city': '', 'isp': ''}

def is_ip_banned(ip_address):
    """检查IP是否被封禁"""
    # 首先检查内存缓存
    if ip_address in blocked_ips:
        ban_info = blocked_ips[ip_address]
        if ban_info['expires_at'] > datetime.now():
            return True, ban_info['reason']
        else:
            # 过期了，从缓存中移除
            del blocked_ips[ip_address]
    
    # 检查数据库
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT ban_reason, expires_at, is_permanent 
            FROM ip_bans 
            WHERE ip_address = %s AND (expires_at > NOW() OR is_permanent = TRUE)
        ''', (ip_address,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            ban_reason, expires_at, is_permanent = result
            # 更新内存缓存
            blocked_ips[ip_address] = {
                'reason': ban_reason,
                'expires_at': expires_at if not is_permanent else datetime.max,
                'is_permanent': is_permanent
            }
            return True, ban_reason
            
    except Exception as e:
        logger.error(f"检查IP封禁状态失败: {e}")
    
    return False, None

def ban_ip(ip_address, reason="Rate limit exceeded", duration_seconds=None):
    """封禁IP地址"""
    if duration_seconds is None:
        duration_seconds = SECURITY_CONFIG['BAN_DURATION']
    
    expires_at = datetime.now() + timedelta(seconds=duration_seconds)
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 检查是否已经存在封禁记录
        cursor.execute('SELECT id, ban_count FROM ip_bans WHERE ip_address = %s', (ip_address,))
        existing = cursor.fetchone()
        
        if existing:
            # 更新现有记录
            ban_id, ban_count = existing
            cursor.execute('''
                UPDATE ip_bans 
                SET ban_reason = %s, ban_count = ban_count + 1, 
                    banned_at = NOW(), expires_at = %s, updated_at = NOW()
                WHERE id = %s
            ''', (reason, expires_at, ban_id))
            logger.warning(f"IP {ip_address} 再次被封禁，原因: {reason}，封禁次数: {ban_count + 1}")
        else:
            # 创建新的封禁记录
            cursor.execute('''
                INSERT INTO ip_bans (ip_address, ban_reason, expires_at) 
                VALUES (%s, %s, %s)
            ''', (ip_address, reason, expires_at))
            logger.warning(f"IP {ip_address} 被封禁，原因: {reason}，解封时间: {expires_at}")
        
        # 更新内存缓存
        blocked_ips[ip_address] = {
            'reason': reason,
            'expires_at': expires_at,
            'is_permanent': False
        }
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        logger.error(f"封禁IP失败: {e}")

def log_request(ip_address, endpoint, method, user_agent, status_code=None, response_time=None):
    """记录请求日志"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO request_logs (ip_address, endpoint, method, user_agent, status_code, response_time) 
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (ip_address, endpoint, method, user_agent, status_code, response_time))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        logger.error(f"记录请求日志失败: {e}")

def check_rate_limit(ip_address):
    """检查IP是否超过速率限制"""
    # 白名单IP不受限制
    if ip_address in SECURITY_CONFIG['WHITELIST_IPS']:
        return False, 0
    
    current_time = time.time()
    window_start = current_time - SECURITY_CONFIG['RATE_LIMIT_WINDOW']
    
    # 清理过期的请求记录
    request_counts[ip_address] = [req_time for req_time in request_counts[ip_address] if req_time > window_start]
    
    # 添加当前请求
    request_counts[ip_address].append(current_time)
    
    request_count = len(request_counts[ip_address])
    
    # 检查是否超过速率限制
    if request_count > SECURITY_CONFIG['RATE_LIMIT_REQUESTS']:
        return True, request_count
    
    return False, request_count

def check_ban_threshold(ip_address):
    """检查IP是否达到封禁阈值"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 检查在指定时间窗口内的请求数量
        window_start = datetime.now() - timedelta(seconds=SECURITY_CONFIG['BAN_WINDOW'])
        cursor.execute('''
            SELECT COUNT(*) FROM request_logs 
            WHERE ip_address = %s AND created_at >= %s
        ''', (ip_address, window_start))
        
        request_count = cursor.fetchone()[0]
        conn.close()
        
        return request_count >= SECURITY_CONFIG['BAN_THRESHOLD'], request_count
        
    except Exception as e:
        logger.error(f"检查封禁阈值失败: {e}")
        return False, 0

def security_middleware():
    """安全中间件装饰器"""
    def decorator(func):
        @wraps(func)
        def decorated_function(*args, **kwargs):
            start_time = time.time()
            ip_address = get_client_ip()
            endpoint = request.endpoint or request.path
            method = request.method
            user_agent = request.headers.get('User-Agent', '')
            
            # 检查IP是否被封禁
            is_banned, ban_reason = is_ip_banned(ip_address)
            if is_banned:
                logger.warning(f"被封禁的IP {ip_address} 尝试访问 {endpoint}，原因: {ban_reason}")
                log_request(ip_address, endpoint, method, user_agent, 403)
                
                # 如果是API请求，返回JSON错误
                if endpoint and (endpoint.startswith('/api/') or 'application/json' in request.headers.get('Accept', '')):
                    return jsonify({
                        'error': '访问被拒绝',
                        'message': '您的IP地址已被暂时封禁',
                        'reason': ban_reason
                    }), 403
                
                # 对于页面请求，显示封禁页面
                try:
                    # 获取封禁详细信息
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute('''
                        SELECT banned_at, expires_at, is_permanent 
                        FROM ip_bans 
                        WHERE ip_address = %s AND (expires_at > NOW() OR is_permanent = TRUE)
                        ORDER BY banned_at DESC LIMIT 1
                    ''', (ip_address,))
                    ban_info = cursor.fetchone()
                    conn.close()
                    
                    # 构建封禁页面URL参数
                    params = f"?reason={ban_reason}"
                    if ban_info:
                        banned_at, expires_at, is_permanent = ban_info
                        if banned_at:
                            params += f"&ban_time={banned_at.isoformat()}"
                        if not is_permanent and expires_at:
                            params += f"&unban_time={expires_at.isoformat()}"
                            remaining_seconds = int((expires_at - datetime.now()).total_seconds())
                            if remaining_seconds > 0:
                                params += f"&remaining={remaining_seconds}"
                    
                    # 读取并返回封禁页面
                    with open('banned.html', 'r', encoding='utf-8') as f:
                        banned_page = f.read()
                    
                    # 如果有参数，添加到页面URL中
                    if params != "?reason=" + ban_reason:
                        banned_page = banned_page.replace(
                            'window.location.search', 
                            f"'{params}' || window.location.search"
                        )
                    
                    return banned_page, 403, {'Content-Type': 'text/html; charset=utf-8'}
                    
                except Exception as e:
                    logger.error(f"显示封禁页面失败: {e}")
                    # 如果封禁页面加载失败，返回简单的HTML错误页面
                    return '''
                    <!DOCTYPE html>
                    <html><head><meta charset="UTF-8"><title>访问被限制</title></head>
                    <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                        <h1 style="color: #ff6b6b;">🚫 访问被限制</h1>
                        <p>您的IP地址已被暂时限制访问。</p>
                        <p>封禁原因: ''' + ban_reason + '''</p>
                        <p>请稍后重试或联系管理员。</p>
                    </body></html>
                    ''', 403, {'Content-Type': 'text/html; charset=utf-8'}
            
            # 检查速率限制
            rate_limited, request_count = check_rate_limit(ip_address)
            if rate_limited:
                logger.warning(f"IP {ip_address} 超过速率限制: {request_count} 请求/分钟")
                
                # 检查是否达到封禁阈值
                should_ban, total_requests = check_ban_threshold(ip_address)
                if should_ban:
                    ban_ip(ip_address, f"频繁访问，{SECURITY_CONFIG['BAN_WINDOW']}秒内请求{total_requests}次")
                    log_request(ip_address, endpoint, method, user_agent, 403)
                    
                    # 如果是API请求，返回JSON错误
                    if endpoint and (endpoint.startswith('/api/') or 'application/json' in request.headers.get('Accept', '')):
                        return jsonify({
                            'error': '访问被拒绝',
                            'message': '由于频繁访问，您的IP地址已被封禁',
                            'ban_duration': f"{SECURITY_CONFIG['BAN_DURATION']}秒"
                        }), 403
                    
                    # 对于页面请求，显示封禁页面
                    try:
                        ban_reason = f"频繁访问，{SECURITY_CONFIG['BAN_WINDOW']}秒内请求{total_requests}次"
                        ban_time = datetime.now()
                        unban_time = ban_time + timedelta(seconds=SECURITY_CONFIG['BAN_DURATION'])
                        remaining_seconds = SECURITY_CONFIG['BAN_DURATION']
                        
                        params = f"?reason={ban_reason}&ban_time={ban_time.isoformat()}&unban_time={unban_time.isoformat()}&remaining={remaining_seconds}"
                        
                        with open('banned.html', 'r', encoding='utf-8') as f:
                            banned_page = f.read()
                        
                        banned_page = banned_page.replace(
                            'window.location.search', 
                            f"'{params}' || window.location.search"
                        )
                        
                        return banned_page, 403, {'Content-Type': 'text/html; charset=utf-8'}
                        
                    except Exception as e:
                        logger.error(f"显示封禁页面失败: {e}")
                        return '''
                        <!DOCTYPE html>
                        <html><head><meta charset="UTF-8"><title>访问被限制</title></head>
                        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                            <h1 style="color: #ff6b6b;">🚫 访问被限制</h1>
                            <p>由于频繁访问，您的IP地址已被封禁。</p>
                            <p>请稍后重试或联系管理员。</p>
                        </body></html>
                        ''', 403, {'Content-Type': 'text/html; charset=utf-8'}
                
                log_request(ip_address, endpoint, method, user_agent, 429)
                
                # 如果是API请求，返回JSON错误
                if endpoint and (endpoint.startswith('/api/') or 'application/json' in request.headers.get('Accept', '')):
                    return jsonify({
                        'error': '请求过于频繁',
                        'message': f'请求速度过快，请稍后再试',
                        'retry_after': SECURITY_CONFIG['RATE_LIMIT_WINDOW']
                    }), 429
                
                # 对于页面请求，显示限制页面
                try:
                    retry_after = SECURITY_CONFIG['RATE_LIMIT_WINDOW']
                    params = f"?reason=请求过于频繁&remaining={retry_after}"
                    
                    with open('banned.html', 'r', encoding='utf-8') as f:
                        banned_page = f.read()
                    
                    # 修改页面标题和内容
                    banned_page = banned_page.replace('访问被限制', '请求过于频繁')
                    banned_page = banned_page.replace('您的IP地址已被暂时限制访问', '您的请求过于频繁，请稍后再试')
                    banned_page = banned_page.replace(
                        'window.location.search', 
                        f"'{params}' || window.location.search"
                    )
                    
                    return banned_page, 429, {'Content-Type': 'text/html; charset=utf-8'}
                    
                except Exception as e:
                    logger.error(f"显示限制页面失败: {e}")
                    return '''
                    <!DOCTYPE html>
                    <html><head><meta charset="UTF-8"><title>请求过于频繁</title></head>
                    <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                        <h1 style="color: #ff9800;">⚠️ 请求过于频繁</h1>
                        <p>您的请求速度过快，请稍后再试。</p>
                        <p>请等待 ''' + str(SECURITY_CONFIG['RATE_LIMIT_WINDOW']) + ''' 秒后重试。</p>
                    </body></html>
                    ''', 429, {'Content-Type': 'text/html; charset=utf-8'}
            
            # 执行原始函数
            try:
                response = func(*args, **kwargs)
                response_time = (time.time() - start_time) * 1000  # 转换为毫秒
                
                # 记录成功的请求
                status_code = 200
                if hasattr(response, 'status_code'):
                    status_code = response.status_code
                elif isinstance(response, tuple) and len(response) > 1:
                    status_code = response[1]
                
                log_request(ip_address, endpoint, method, user_agent, status_code, response_time)
                return response
                
            except Exception as e:
                response_time = (time.time() - start_time) * 1000
                log_request(ip_address, endpoint, method, user_agent, 500, response_time)
                raise
        
        return decorated_function
    return decorator

def record_visitor():
    """记录访客信息"""
    ip = get_client_ip()
    user_agent = request.headers.get('User-Agent', '')
    referer = request.headers.get('Referer', '')
    
    # 获取地理位置信息
    location = get_ip_location(ip)
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO activity_logs (activity_type, ip_address, user_agent, referer, country, city) 
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', ('visit', ip, user_agent, referer, location['country'], location['city']))
        
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"记录访客失败: {e}")

@app.route('/')
@security_middleware()
def index():
    record_visitor()
    return render_template_string(open('birthday.html', 'r', encoding='utf-8').read())

@app.route('/birthday')
@security_middleware()
def birthday():
    return render_template_string(open('birthday.html', 'r', encoding='utf-8').read())

@app.route('/<path:filename>')
@security_middleware()
def static_files(filename):
    """静态文件服务"""
    return send_from_directory('.', filename)

@app.route('/api/messages', methods=['GET'])
@security_middleware()
def get_messages():
    """获取所有留言"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取留言
        cursor.execute('''
            SELECT name, message, emoji, created_at 
            FROM activity_logs 
            WHERE activity_type = 'message'
            ORDER BY created_at DESC
        ''')
        messages = []
        for row in cursor.fetchall():
            messages.append({
                'name': row[0],
                'message': row[1],
                'emoji': row[2],
                'timestamp': row[3].isoformat() if row[3] else None
            })
        
        conn.close()
        
        return jsonify(messages)
        
    except Exception as e:
        logger.error(f"获取留言失败: {e}")
        return jsonify({'error': '获取留言失败'}), 500

@app.route('/api/messages', methods=['POST'])
@security_middleware()
def add_message():
    """添加新留言"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': '无效的请求数据'}), 400
    
    name = data.get('name', '').strip()
    message = data.get('message', '').strip()
    emoji = data.get('emoji', '🎂')
    
    # 验证输入
    if not name or not message:
        return jsonify({'error': '姓名和留言内容不能为空'}), 400
    
    if len(name) > 50:
        return jsonify({'error': '姓名长度不能超过50个字符'}), 400
    
    if len(message) > 500:
        return jsonify({'error': '留言长度不能超过500个字符'}), 400
    
    # 获取客户端IP和其他信息
    ip = get_client_ip()
    user_agent = request.headers.get('User-Agent', '')
    referer = request.headers.get('Referer', '')
    
    # 获取地理位置信息
    location = get_ip_location(ip)
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO activity_logs (activity_type, name, message, emoji, ip_address, user_agent, referer, country, city) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', ('message', name, message, emoji, ip, user_agent, referer, location['country'], location['city']))
        
        conn.commit()
        message_id = cursor.lastrowid
        conn.close()
        
        logger.info(f"新留言来自 {name}: {message}")
        
        # 15%概率获得红包口令
        red_packet_code = None
        if random.random() < 0.5:  # 15%概率
            red_packet_code = get_available_red_packet_code(ip)
            if red_packet_code:
                logger.info(f"用户 {ip} 获得红包口令: {red_packet_code}")
            else:
                logger.info(f"用户 {ip} 触发红包但无可用口令")
        
        return jsonify({
            'success': True,
            'id': message_id,
            'message': '留言保存成功',
            'red_packet_code': red_packet_code
        })
        
    except Exception as e:
        logger.error(f"保存留言失败: {e}")
        return jsonify({'error': '保存留言失败'}), 500

@app.route('/api/messages/<int:message_id>', methods=['DELETE'])
def delete_message(message_id):
    """删除指定留言"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 先获取所有留言，找到对应的留言
        cursor.execute('''
            SELECT id FROM activity_logs 
            WHERE activity_type = 'message'
            ORDER BY created_at DESC
        ''')
        message_ids = [row[0] for row in cursor.fetchall()]
        
        if message_id >= len(message_ids):
            conn.close()
            return jsonify({'error': '留言不存在'}), 404
        
        # 获取实际的数据库ID
        actual_id = message_ids[message_id]
        
        # 删除留言
        cursor.execute('DELETE FROM activity_logs WHERE id = %s', (actual_id,))
        conn.commit()
        conn.close()
        
        logger.info(f"删除留言 ID: {actual_id}")
        
        return jsonify({
            'success': True,
            'message': '留言删除成功'
        })
        
    except Exception as e:
        logger.error(f"删除留言失败: {e}")
        return jsonify({'error': '删除留言失败'}), 500

@app.route('/api/visitors', methods=['GET'])
@security_middleware()
def get_visitors():
    """获取访问记录"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取最近的访问记录
        cursor.execute('''
            SELECT ip_address, user_agent, referer, created_at, country, city 
            FROM activity_logs 
            WHERE activity_type = 'visit'
            ORDER BY created_at DESC
            LIMIT 50
        ''')
        
        visitors = []
        for row in cursor.fetchall():
            visitors.append({
                'ip': row[0],
                'user_agent': row[1] or '',
                'referer': row[2] or '',
                'timestamp': row[3].isoformat() if row[3] else None,
                'country': row[4] or '',
                'city': row[5] or '',
                'location': f"{row[4]} {row[5]}".strip() if (row[4] or row[5]) else '未知'
            })
        
        conn.close()
        
        return jsonify({
            'visitors': visitors
        })
        
    except Exception as e:
        logger.error(f"获取访问记录失败: {e}")
        return jsonify({'error': '获取访问记录失败'}), 500

@app.route('/api/visit', methods=['POST'])
@security_middleware()
def record_visit():
    """记录访问"""
    try:
        data = request.get_json() or {}
        ip = get_client_ip()
        user_agent = request.headers.get('User-Agent', '')
        referer = request.headers.get('Referer', '')
        
        # 获取地理位置信息
        location = get_ip_location(ip)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO activity_logs (activity_type, ip_address, user_agent, referer, country, city) 
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', ('visit', ip, user_agent, referer, location['country'], location['city']))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"记录访问失败: {e}")
        return jsonify({'error': '记录访问失败'}), 500

@app.route('/api/stats', methods=['GET'])
@security_middleware()
def get_stats():
    """获取统计信息"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 总留言数
        cursor.execute('SELECT COUNT(*) FROM activity_logs WHERE activity_type = %s', ('message',))
        total_messages = cursor.fetchone()[0]
        
        # 总访客数（独立IP）
        cursor.execute('SELECT COUNT(DISTINCT ip_address) FROM activity_logs WHERE activity_type = %s', ('visit',))
        total_visitors = cursor.fetchone()[0]
        
        # 今日留言数
        today = datetime.now().strftime('%Y-%m-%d')
        cursor.execute('SELECT COUNT(*) FROM activity_logs WHERE activity_type = %s AND DATE(created_at) = %s', ('message', today))
        today_messages = cursor.fetchone()[0]
        
        # 今日访客数（独立IP）
        cursor.execute('SELECT COUNT(DISTINCT ip_address) FROM activity_logs WHERE activity_type = %s AND DATE(created_at) = %s', ('visit', today))
        today_visitors = cursor.fetchone()[0]
        
        # 独特留言者数量
        cursor.execute('SELECT COUNT(DISTINCT name) FROM activity_logs WHERE activity_type = %s', ('message',))
        unique_messagers = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'totalMessages': total_messages,
            'totalVisitors': total_visitors,
            'todayMessages': today_messages,
            'todayVisitors': today_visitors,
            'uniqueMessagers': unique_messagers
        })
        
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        return jsonify({'error': '获取统计信息失败'}), 500

def get_available_red_packet_code(ip_address):
    """获取可用的红包口令"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 首先检查该IP是否已经中过奖
        cursor.execute('''
            SELECT COUNT(*) FROM red_packet_codes 
            WHERE used_by_ip = %s AND is_used = TRUE
        ''', (ip_address,))
        
        already_won = cursor.fetchone()[0]
        if already_won > 0:
            logger.info(f"IP {ip_address} 已经中过奖，不能再次中奖")
            conn.close()
            return None
        
        # 获取一个未使用的红包口令
        cursor.execute('''
            SELECT id, code FROM red_packet_codes 
            WHERE is_used = FALSE 
            ORDER BY created_at ASC 
            LIMIT 1
        ''')
        
        result = cursor.fetchone()
        if result:
            code_id, code = result
            
            # 标记为已使用
            cursor.execute('''
                UPDATE red_packet_codes 
                SET is_used = TRUE, used_by_ip = %s, used_at = NOW() 
                WHERE id = %s
            ''', (ip_address, code_id))
            
            conn.commit()
            conn.close()
            return code
        
        conn.close()
        return None
        
    except Exception as e:
        logger.error(f"获取红包口令失败: {e}")
        return None

@app.route('/api/red-packets', methods=['GET'])
def get_red_packets():
    """获取红包口令列表"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, code, description, amount, is_used, used_by_ip, used_at, created_at
            FROM red_packet_codes 
            ORDER BY created_at DESC
        ''')
        
        red_packets = []
        for row in cursor.fetchall():
            red_packets.append({
                'id': row[0],
                'code': row[1],
                'description': row[2],
                'amount': float(row[3]) if row[3] else None,
                'is_used': bool(row[4]),
                'used_by_ip': row[5],
                'used_at': row[6].isoformat() if row[6] else None,
                'created_at': row[7].isoformat() if row[7] else None
            })
        
        conn.close()
        return jsonify(red_packets)
        
    except Exception as e:
        logger.error(f"获取红包列表失败: {e}")
        return jsonify({'error': '获取红包列表失败'}), 500

@app.route('/api/red-packets', methods=['POST'])
def add_red_packet():
    """添加红包口令"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': '无效的请求数据'}), 400
    
    code = data.get('code', '') or ''
    description = data.get('description') or ''
    amount = data.get('amount')
    
    # 安全地处理字符串
    code = code.strip() if isinstance(code, str) else ''
    description = description.strip() if isinstance(description, str) else ''
    
    if not code:
        return jsonify({'error': '口令不能为空'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO red_packet_codes (code, description, amount) 
            VALUES (%s, %s, %s)
        ''', (code, description, amount))
        
        conn.commit()
        red_packet_id = cursor.lastrowid
        conn.close()
        
        logger.info(f"新增红包口令: {code}")
        
        return jsonify({
            'success': True,
            'id': red_packet_id,
            'message': '红包口令添加成功'
        })
        
    except pymysql.IntegrityError:
        return jsonify({'error': '该口令已存在'}), 400
    except Exception as e:
        logger.error(f"添加红包口令失败: {e}")
        return jsonify({'error': '添加红包口令失败'}), 500

@app.route('/api/red-packets/<int:packet_id>', methods=['DELETE'])
def delete_red_packet(packet_id):
    """删除红包口令"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM red_packet_codes WHERE id = %s', (packet_id,))
        conn.commit()
        conn.close()
        
        logger.info(f"删除红包口令 ID: {packet_id}")
        
        return jsonify({
            'success': True,
            'message': '红包口令删除成功'
        })
        
    except Exception as e:
        logger.error(f"删除红包口令失败: {e}")
        return jsonify({'error': '删除红包口令失败'}), 500

# 安全管理API
@app.route('/api/security/banned-ips', methods=['GET'])
@security_middleware()
def get_banned_ips():
    """获取被封禁的IP列表"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT ip_address, ban_reason, ban_count, banned_at, expires_at, is_permanent
            FROM ip_bans 
            WHERE expires_at > NOW() OR is_permanent = TRUE
            ORDER BY banned_at DESC
        ''')
        
        banned_ips = []
        for row in cursor.fetchall():
            # Calculate remaining time safely
            remaining_time = 'Permanent'
            if row[4] and not row[5]:  # has expires_at and not permanent
                time_diff = row[4] - datetime.now()
                if time_diff.total_seconds() > 0:
                    remaining_time = str(time_diff).split('.')[0]  # Remove microseconds
                else:
                    remaining_time = 'Expired'
            
            banned_ips.append({
                'ip_address': row[0],
                'ban_reason': row[1],
                'ban_count': row[2],
                'banned_at': row[3].isoformat() if row[3] else None,
                'expires_at': row[4].isoformat() if row[4] else None,
                'is_permanent': bool(row[5]),
                'remaining_time': remaining_time
            })
        
        conn.close()
        return jsonify(banned_ips)
        
    except Exception as e:
        logger.error(f"获取封禁IP列表失败: {e}")
        return jsonify({'error': '获取封禁IP列表失败'}), 500

@app.route('/api/security/banned-ips/<ip_address>', methods=['DELETE'])
@security_middleware()
def unban_ip(ip_address):
    """解封IP地址"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM ip_bans WHERE ip_address = %s', (ip_address,))
        conn.commit()
        conn.close()
        
        # 从内存缓存中移除
        if ip_address in blocked_ips:
            del blocked_ips[ip_address]
        
        logger.info(f"IP {ip_address} 已被解封")
        
        return jsonify({
            'success': True,
            'message': f'IP {ip_address} 已被解封'
        })
        
    except Exception as e:
        logger.error(f"解封IP失败: {e}")
        return jsonify({'error': '解封IP失败'}), 500

@app.route('/api/security/banned-ips', methods=['POST'])
@security_middleware()
def manual_ban_ip():
    """手动封禁IP地址"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': '无效的请求数据'}), 400
    
    ip_address = data.get('ip_address', '').strip()
    reason = data.get('reason', '手动封禁').strip()
    duration = data.get('duration', SECURITY_CONFIG['BAN_DURATION'])  # 秒
    is_permanent = data.get('is_permanent', False)
    
    if not ip_address:
        return jsonify({'error': 'IP地址不能为空'}), 400
    
    try:
        if is_permanent:
            ban_ip(ip_address, reason, duration_seconds=None)
            # 设置为永久封禁
            conn = get_db_connection()
            cursor = conn.cursor()
            # 使用datetime对象而不是字符串
            permanent_date = datetime(2099, 12, 31, 23, 59, 59)
            cursor.execute('''
                UPDATE ip_bans 
                SET is_permanent = TRUE, expires_at = %s
                WHERE ip_address = %s
            ''', (permanent_date, ip_address))
            conn.commit()
            conn.close()
        else:
            ban_ip(ip_address, reason, duration)
        
        return jsonify({
            'success': True,
            'message': f'IP {ip_address} 已被封禁'
        })
        
    except Exception as e:
        logger.error(f"手动封禁IP失败: {e}")
        return jsonify({'error': '手动封禁IP失败'}), 500

@app.route('/api/security/request-logs', methods=['GET'])
@security_middleware()
def get_request_logs():
    """获取请求日志"""
    try:
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 100)  # 最大100条
        ip_filter = request.args.get('ip', '')
        
        offset = (page - 1) * limit
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 构建查询条件
        where_clause = ''
        params = []
        if ip_filter:
            where_clause = 'WHERE ip_address = %s'
            params.append(ip_filter)
        
        # 获取总数
        cursor.execute(f'SELECT COUNT(*) FROM request_logs {where_clause}', params)
        total = cursor.fetchone()[0]
        
        # 获取日志
        cursor.execute(f'''
            SELECT ip_address, endpoint, method, user_agent, status_code, response_time, created_at
            FROM request_logs {where_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        ''', params + [limit, offset])
        
        logs = []
        for row in cursor.fetchall():
            logs.append({
                'ip_address': row[0],
                'endpoint': row[1],
                'method': row[2],
                'user_agent': row[3] or '',
                'status_code': row[4],
                'response_time': row[5],
                'created_at': row[6].isoformat() if row[6] else None
            })
        
        conn.close()
        
        return jsonify({
            'logs': logs,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit
        })
        
    except Exception as e:
        logger.error(f"获取请求日志失败: {e}")
        return jsonify({'error': '获取请求日志失败'}), 500

@app.route('/api/security/stats', methods=['GET'])
@security_middleware()
def get_security_stats():
    """获取安全统计信息"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 当前被封禁的IP数量
        cursor.execute('SELECT COUNT(*) FROM ip_bans WHERE expires_at > NOW() OR is_permanent = TRUE')
        active_bans = cursor.fetchone()[0]
        
        # 今日被封禁的IP数量
        today = datetime.now().strftime('%Y-%m-%d')
        cursor.execute('SELECT COUNT(*) FROM ip_bans WHERE DATE(banned_at) = %s', (today,))
        today_bans = cursor.fetchone()[0]
        
        # 今日请求总数
        cursor.execute('SELECT COUNT(*) FROM request_logs WHERE DATE(created_at) = %s', (today,))
        today_requests = cursor.fetchone()[0]
        
        # 今日被拒绝的请求数（403, 429状态码）
        cursor.execute('''
            SELECT COUNT(*) FROM request_logs 
            WHERE DATE(created_at) = %s AND status_code IN (403, 429)
        ''', (today,))
        today_blocked = cursor.fetchone()[0]
        
        # 最活跃的IP（今日请求最多的前10个）
        cursor.execute('''
            SELECT ip_address, COUNT(*) as request_count
            FROM request_logs 
            WHERE DATE(created_at) = %s
            GROUP BY ip_address
            ORDER BY request_count DESC
            LIMIT 10
        ''', (today,))
        
        top_ips = []
        for row in cursor.fetchall():
            top_ips.append({
                'ip_address': row[0],
                'request_count': row[1]
            })
        
        conn.close()
        
        return jsonify({
            'active_bans': active_bans,
            'today_bans': today_bans,
            'today_requests': today_requests,
            'today_blocked': today_blocked,
            'top_ips': top_ips,
            'security_config': SECURITY_CONFIG
        })
        
    except Exception as e:
        logger.error(f"获取安全统计失败: {e}")
        return jsonify({'error': '获取安全统计失败'}), 500

@app.route('/admin')
def admin_page():
    """管理后台页面"""
    return send_from_directory('.', 'admin.html')

@app.errorhandler(404)
def not_found(error):
    """404错误处理"""
    return jsonify({'error': '页面未找到'}), 404

@app.errorhandler(500)
def internal_error(error):
    """500错误处理"""
    return jsonify({'error': '服务器内部错误'}), 500

if __name__ == '__main__':
    try:
        # 初始化数据库
        print("🔧 正在初始化数据库...")
        init_database()
        print("✅ 数据库初始化完成！")
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        print("⚠️ 应用将继续启动，但某些功能可能不可用")
    
    # 启动服务器
    port = int(os.environ.get('PORT', 3000))
    print(f"🎂 生日留言板服务器启动在 http://localhost:{port}")
    print(f"🎉 准备收集生日祝福！")
    print(f"🛡️ 安全防护已启用:")
    print(f"   - 速率限制: {SECURITY_CONFIG['RATE_LIMIT_REQUESTS']}请求/{SECURITY_CONFIG['RATE_LIMIT_WINDOW']}秒")
    print(f"   - 封禁阈值: {SECURITY_CONFIG['BAN_THRESHOLD']}请求/{SECURITY_CONFIG['BAN_WINDOW']}秒")
    print(f"   - 封禁时长: {SECURITY_CONFIG['BAN_DURATION']}秒")
    
    app.run(host='0.0.0.0', port=port, debug=True)
