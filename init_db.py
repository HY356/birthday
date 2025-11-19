#!/usr/bin/env python3
"""
Database initialization script for the birthday board application.
This script creates all necessary MySQL tables.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import init_database, logger

if __name__ == '__main__':
    try:
        print("🔧 正在初始化数据库...")
        init_database()
        print("✅ 数据库初始化完成！")
        print("📋 已创建以下表:")
        print("   - activity_logs (活动日志表)")
        print("   - red_packet_codes (红包口令表)")
        print("   - ip_bans (IP封禁表)")
        print("   - request_logs (请求日志表)")
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        sys.exit(1)
