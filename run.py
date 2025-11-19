#!/usr/bin/env python3
"""
生日留言板启动脚本
"""

import subprocess
import sys
import os

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 7):
        print("❌ 需要Python 3.7或更高版本")
        sys.exit(1)
    print(f"✅ Python版本: {sys.version}")

def install_requirements():
    """安装依赖包"""
    print("📦 正在安装依赖包...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ 依赖包安装完成")
    except subprocess.CalledProcessError:
        print("❌ 依赖包安装失败，请手动运行: pip install -r requirements.txt")
        sys.exit(1)

def main():
    """主函数"""
    print("🎂 生日留言板启动程序")
    print("=" * 40)
    
    # 检查Python版本
    check_python_version()
    
    # 安装依赖
    install_requirements()
    
    # 启动应用
    print("\n🚀 启动生日留言板...")
    print("📱 访问地址: http://localhost:3000")
    print("🎉 按 Ctrl+C 停止服务器")
    print("=" * 40)
    
    try:
        from app import app, init_database
        init_database()
        app.run(host='0.0.0.0', port=3000, debug=True)
    except KeyboardInterrupt:
        print("\n👋 服务器已停止")
    except ImportError as e:
        print(f"❌ 导入错误: {e}")
        print("请确保已安装所有依赖包")

if __name__ == "__main__":
    main()
