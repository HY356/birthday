#!/bin/bash
# 生日留言板部署脚本

# 设置环境变量
export FLASK_APP=app.py
export FLASK_ENV=production

# 安装依赖
pip install -r requirements.txt

# 使用gunicorn启动应用
echo "启动生日留言板应用..."

# 基础启动命令
gunicorn --config gunicorn.conf.py app:app

# 或者使用以下命令行参数启动（不使用配置文件）
# gunicorn -w 4 -b 0.0.0.0:3000 --timeout 30 --keep-alive 2 --max-requests 1000 app:app
