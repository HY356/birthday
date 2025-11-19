const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 数据库初始化
const db = new sqlite3.Database('birthday_messages.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        
        // 创建留言表
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            message TEXT NOT NULL,
            emoji TEXT DEFAULT '🎂',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
            } else {
                console.log('Messages table ready.');
            }
        });
        
        // 创建访客统计表
        db.run(`CREATE TABLE IF NOT EXISTS visitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address TEXT UNIQUE,
            first_visit DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_visit DATETIME DEFAULT CURRENT_TIMESTAMP,
            visit_count INTEGER DEFAULT 1
        )`, (err) => {
            if (err) {
                console.error('Error creating visitors table:', err.message);
            } else {
                console.log('Visitors table ready.');
            }
        });
    }
});

// 记录访客
function recordVisitor(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    db.run(`INSERT OR REPLACE INTO visitors (ip_address, last_visit, visit_count) 
            VALUES (?, CURRENT_TIMESTAMP, 
                COALESCE((SELECT visit_count FROM visitors WHERE ip_address = ?) + 1, 1))`,
        [ip, ip], (err) => {
            if (err) {
                console.error('Error recording visitor:', err.message);
            }
        });
    
    next();
}

// 路由

// 主页
app.get('/', recordVisitor, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 获取所有留言
app.get('/api/messages', (req, res) => {
    db.all(`SELECT name, message, emoji, timestamp FROM messages 
            ORDER BY timestamp DESC`, (err, rows) => {
        if (err) {
            console.error('Error fetching messages:', err.message);
            res.status(500).json({ error: 'Failed to fetch messages' });
            return;
        }
        
        // 获取统计信息
        db.get(`SELECT COUNT(*) as totalMessages FROM messages`, (err, messageCount) => {
            if (err) {
                console.error('Error counting messages:', err.message);
                res.status(500).json({ error: 'Failed to get statistics' });
                return;
            }
            
            db.get(`SELECT COUNT(*) as totalVisitors FROM visitors`, (err, visitorCount) => {
                if (err) {
                    console.error('Error counting visitors:', err.message);
                    res.status(500).json({ error: 'Failed to get statistics' });
                    return;
                }
                
                res.json({
                    messages: rows,
                    stats: {
                        totalMessages: messageCount.totalMessages,
                        totalVisitors: visitorCount.totalVisitors
                    }
                });
            });
        });
    });
});

// 添加新留言
app.post('/api/messages', (req, res) => {
    const { name, message, emoji } = req.body;
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    // 验证输入
    if (!name || !message) {
        return res.status(400).json({ error: 'Name and message are required' });
    }
    
    if (name.length > 50) {
        return res.status(400).json({ error: 'Name is too long' });
    }
    
    if (message.length > 500) {
        return res.status(400).json({ error: 'Message is too long' });
    }
    
    // 插入留言
    db.run(`INSERT INTO messages (name, message, emoji, ip_address) 
            VALUES (?, ?, ?, ?)`,
        [name.trim(), message.trim(), emoji || '🎂', ip],
        function(err) {
            if (err) {
                console.error('Error inserting message:', err.message);
                res.status(500).json({ error: 'Failed to save message' });
                return;
            }
            
            console.log(`New message from ${name}: ${message}`);
            res.json({ 
                success: true, 
                id: this.lastID,
                message: 'Message saved successfully' 
            });
        });
});

// 获取统计信息
app.get('/api/stats', (req, res) => {
    db.get(`SELECT COUNT(*) as totalMessages FROM messages`, (err, messageCount) => {
        if (err) {
            console.error('Error counting messages:', err.message);
            res.status(500).json({ error: 'Failed to get statistics' });
            return;
        }
        
        db.get(`SELECT COUNT(*) as totalVisitors FROM visitors`, (err, visitorCount) => {
            if (err) {
                console.error('Error counting visitors:', err.message);
                res.status(500).json({ error: 'Failed to get statistics' });
                return;
            }
            
            db.get(`SELECT COUNT(DISTINCT name) as uniqueMessagers FROM messages`, (err, uniqueCount) => {
                if (err) {
                    console.error('Error counting unique messagers:', err.message);
                    res.status(500).json({ error: 'Failed to get statistics' });
                    return;
                }
                
                res.json({
                    totalMessages: messageCount.totalMessages,
                    totalVisitors: visitorCount.totalVisitors,
                    uniqueMessagers: uniqueCount.uniqueMessagers
                });
            });
        });
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🎂 Birthday message board server running on http://localhost:${PORT}`);
    console.log(`🎉 Ready to collect birthday wishes!`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
