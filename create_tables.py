#!/usr/bin/env python3
"""
Direct database table creation script
"""

import pymysql
from dotenv import load_dotenv
import os

# 加载环境变量
load_dotenv()

# MySQL 数据库配置
MYSQL_CONFIG = {
    'host': os.getenv('MYSQL_HOST', '43.142.9.140'),
    'port': int(os.getenv('MYSQL_PORT', 3306)),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASSWORD', 'Wanghao@520'),
    'database': os.getenv('MYSQL_DATABASE', 'birthday_board'),
    'charset': 'utf8mb4',
    'autocommit': True
}

def create_tables():
    """创建所有必需的数据库表"""
    try:
        connection = pymysql.connect(**MYSQL_CONFIG)
        cursor = connection.cursor()
        
        print("🔧 正在创建数据库表...")
        
        # 创建IP封禁表
        print("📋 创建 ip_bans 表...")
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
        
        # 创建请求日志表
        print("📋 创建 request_logs 表...")
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
        
        # 确保其他表也存在
        print("📋 创建 activity_logs 表...")
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
        
        print("📋 创建 red_packet_codes 表...")
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
        
        connection.commit()
        connection.close()
        
        print("✅ 所有数据库表创建完成！")
        print("📋 已创建/确认以下表:")
        print("   - activity_logs (活动日志表)")
        print("   - red_packet_codes (红包口令表)")
        print("   - ip_bans (IP封禁表)")
        print("   - request_logs (请求日志表)")
        
    except Exception as e:
        print(f"❌ 创建数据库表失败: {e}")
        raise

if __name__ == '__main__':
    create_tables()
