-- 生日留言板 MySQL 数据库表结构
-- Birthday Message Board MySQL Database Schema

-- 创建数据库
CREATE DATABASE IF NOT EXISTS birthday_board 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE birthday_board;

-- 统一的活动记录表 (包含留言和访问记录)
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
  COMMENT='活动日志表：记录留言和访问信息';

-- 创建视图：留言视图
CREATE VIEW messages_view AS
SELECT 
    id,
    name,
    message,
    emoji,
    ip_address,
    created_at as timestamp
FROM activity_logs 
WHERE activity_type = 'message'
ORDER BY created_at DESC;

-- 创建视图：访问统计视图
CREATE VIEW visit_stats_view AS
SELECT 
    DATE(created_at) as visit_date,
    COUNT(*) as total_visits,
    COUNT(DISTINCT ip_address) as unique_visitors
FROM activity_logs 
WHERE activity_type = 'visit'
GROUP BY DATE(created_at)
ORDER BY visit_date DESC;

-- 插入示例数据
INSERT INTO activity_logs (activity_type, name, message, emoji, ip_address) VALUES
('message', '小明', '生日快乐！祝你天天开心！🎉', '🎉', '192.168.1.100'),
('message', '小红', '愿你的每一天都充满阳光和快乐！', '🌞', '192.168.1.101'),
('message', '小李', '生日快乐！新的一岁要更加精彩哦！', '🎂', '192.168.1.102');

INSERT INTO activity_logs (activity_type, ip_address, user_agent) VALUES
('visit', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('visit', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
('visit', '192.168.1.102', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)');
