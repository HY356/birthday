// 全局变量
let messages = [];
let selectedEmoji = '🎂';
let messagesContainer;
let totalMessagesElement;
let totalVisitorsElement;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    messagesContainer = document.getElementById('birthdayMessagesContainer');
    totalMessagesElement = document.getElementById('totalMessages');
    totalVisitorsElement = document.getElementById('totalVisitors');
    
    // 页面加载完成后添加淡入效果
    setTimeout(() => {
        document.body.classList.add('page-fade-in');
    }, 100);
    
    // 立即初始化弹幕系统并开始显示
    initializeDanmaku();
    startDanmaku();
    
    // 启动生日特效
    startBirthdayEffects();
    
    // 初始化音乐盒
    initMusicBox();
    
    // 异步加载数据，不阻塞弹幕显示
    loadMessages();
    loadBirthdayData();
    
    // 启动动画
    triggerBirthdayAnimations();
    
    // 记录访问
    recordVisit();
});

// 跳转到倒计时页面功能已移除，现在直接显示生日页面

// 启动生日特效
function startBirthdayEffects() {
    // 启动彩纸特效
    startConfetti();
    
    // 启动气球动画
    const balloons = document.querySelectorAll('.balloon');
    balloons.forEach((balloon, index) => {
        setTimeout(() => {
            balloon.style.animation = 'balloon-float 6s ease-in-out infinite';
        }, index * 200);
    });
    
    // 弹幕已在DOMContentLoaded中启动，这里不需要重复启动
}

// 启动彩纸动画
function startConfetti() {
    window.confettiStopped = false;
    setTimeout(() => {
        createConfetti();
    }, 100);
}

// 创建彩纸
function createConfetti() {
    let confettiContainer = document.getElementById('confettiContainer');
    
    if (!confettiContainer) {
        confettiContainer = document.createElement('div');
        confettiContainer.id = 'confettiContainer';
        confettiContainer.className = 'confetti-container';
        document.body.appendChild(confettiContainer);
    }
    
    // 创建80个彩纸片
    for (let i = 0; i < 80; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (Math.random() * 3 + 4) + 's';
        confetti.style.top = '-200px';
        confetti.style.transform = `translateX(${(Math.random() - 0.5) * 100}px)`;
        
        confettiContainer.appendChild(confetti);
        
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 8000);
    }
    
    // 每2秒重新创建彩纸
    setTimeout(() => {
        const container = document.getElementById('confettiContainer');
        if (container && !window.confettiStopped) {
            createConfetti();
        }
    }, 2000);
}

// 弹幕系统
let danmakuMessages = [];
let danmakuContainer;

const defaultMessages = [
    { "message": "岁华二十四，星辉为你加冕。", emoji: "👑" },
    { "message": "廿四芳辰，宇宙为你点亮光年。", emoji: "✨" },
    { "message": "你降临的第24次春分，万物为你称臣。", emoji: "🌿" },
    { "message": "时间把第24颗珍珠镶进你眼眸。", emoji: "🤍" },
    { "message": "二十四载春秋，你是人间最美的诗。", emoji: "🌸" },
    { "message": "愿你24岁的每一天都闪闪发光。", emoji: "💫" },
    { "message": "生日快乐！愿所有美好如期而至。", emoji: "🎂" },
    { "message": "今天全世界都在为你庆祝！", emoji: "🎉" }
];

function initializeDanmaku() {
    danmakuContainer = document.getElementById('birthdayDanmakuContainer');
    if (!danmakuContainer) {
        console.error('弹幕容器未找到');
        return;
    }
    
    console.log('弹幕容器找到:', danmakuContainer);
    
    // 始终使用默认消息确保弹幕立即可用
    danmakuMessages = [...defaultMessages];
    
    console.log('弹幕消息数量:', danmakuMessages.length);
}

function startDanmaku() {
    if (!danmakuContainer) {
        // 如果容器不存在，尝试重新初始化
        initializeDanmaku();
        if (!danmakuContainer) return;
    }
    
    // 确保有默认消息
    if (danmakuMessages.length === 0) {
        danmakuMessages = [...defaultMessages];
    }
    
    function createDanmaku() {
        if (danmakuMessages.length === 0) return;
        
        const message = danmakuMessages[Math.floor(Math.random() * danmakuMessages.length)];
        const danmaku = document.createElement('div');
        danmaku.className = 'danmaku-item';
        
        const emoji = message.emoji || '🎂';
        const text = message.message || message.text || '';
        const author = message.name ? ` — ${message.name}` : '';
        
        danmaku.setAttribute('data-emoji', emoji);
        danmaku.innerHTML = `<span class="danmaku-text">${text}${author}</span>`;
        
        // 随机垂直位置（全屏范围）
        const minTop = 10;
        const maxTop = 85;
        const randomTop = Math.random() * (maxTop - minTop) + minTop;
        danmaku.style.top = randomTop + '%';
        
        // 更快的动画速度（15-25秒）
        const duration = Math.random() * 10 + 15;
        danmaku.style.animationDuration = duration + 's';
        
        danmaku.style.left = '100%';
        danmaku.style.zIndex = '1002';
        
        danmakuContainer.appendChild(danmaku);
        
        // 动画结束后移除元素
        danmaku.addEventListener('animationend', () => {
            if (danmaku.parentNode) {
                danmaku.parentNode.removeChild(danmaku);
            }
        });
        
        // 备用清理机制
        setTimeout(() => {
            if (danmaku.parentNode) {
                danmaku.parentNode.removeChild(danmaku);
            }
        }, (duration + 1) * 1000);
    }
    
    // 立即创建多个弹幕，间隔更短
    for (let i = 0; i < 8; i++) {
        setTimeout(() => createDanmaku(), i * 200);
    }
    
    // 更频繁地创建新弹幕
    setInterval(() => {
        if (Math.random() > 0.1) {
            createDanmaku();
        }
    }, 1500);
}

// 触发生日页面动画
function triggerBirthdayAnimations() {
    const animateElements = document.querySelectorAll('.birthday-page .animate-in');
    
    animateElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            el.style.transition = 'all 0.8s ease-out';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 150 + 200);
    });
}

// 加载生日页面数据
async function loadBirthdayData() {
    // 获取统计数据
    try {
        const statsResponse = await fetch('/api/stats');
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            
            if (totalMessagesElement) {
                totalMessagesElement.textContent = stats.totalMessages || messages.length;
            }
            
            if (totalVisitorsElement) {
                totalVisitorsElement.textContent = stats.totalVisitors || 0;
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        // 使用本地数据作为后备
        if (totalMessagesElement) {
            totalMessagesElement.textContent = messages.length;
        }
        if (totalVisitorsElement) {
            totalVisitorsElement.textContent = 0;
        }
    }
    
    // 祝福消息通过弹幕系统显示，不需要在这里处理
}

// 表情选择器
function initializeEmojiSelector() {
    const emojiGrid = document.getElementById('emojiGrid');
    if (!emojiGrid) return;
    
    const emojis = [
        { emoji: '🎂', name: '生日蛋糕' },
        { emoji: '🎉', name: '庆祝' },
        { emoji: '🎈', name: '气球' },
        { emoji: '🎁', name: '礼物' },
        { emoji: '🌟', name: '星星' },
        { emoji: '💖', name: '爱心' },
        { emoji: '🥳', name: '派对' },
        { emoji: '🎊', name: '拉花' },
        { emoji: '🌈', name: '彩虹' },
        { emoji: '✨', name: '闪光' },
        { emoji: '🎵', name: '音乐' },
        { emoji: '🌸', name: '樱花' }
    ];
    
    emojis.forEach(item => {
        const emojiCard = document.createElement('div');
        emojiCard.className = 'emoji-card';
        emojiCard.innerHTML = `
            <div class="emoji">${item.emoji}</div>
            <div class="emoji-name">${item.name}</div>
        `;
        
        emojiCard.addEventListener('click', () => {
            document.querySelectorAll('.emoji-card').forEach(card => card.classList.remove('active'));
            emojiCard.classList.add('active');
            selectedEmoji = item.emoji;
        });
        
        if (item.emoji === selectedEmoji) {
            emojiCard.classList.add('active');
        }
        
        emojiGrid.appendChild(emojiCard);
    });
}

// 弹窗控制
function openMessageModal() {
    const modal = document.getElementById('messageModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMessageModal() {
    const modal = document.getElementById('messageModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // 重置表单
    document.getElementById('messageForm').reset();
    document.getElementById('charCount').textContent = '0';
}

// 表单处理
document.addEventListener('DOMContentLoaded', function() {
    const messageForm = document.getElementById('messageForm');
    const messageText = document.getElementById('messageText');
    const charCount = document.getElementById('charCount');
    const totalMessagesElement = document.getElementById('totalMessages');
    const totalVisitorsElement = document.getElementById('totalVisitors');
    const messagesContainer = document.getElementById('messagesContainer');
    const emojiSelector = document.getElementById('emojiSelector');
    const modalEmojiDisplay = document.getElementById('modalEmojiDisplay');
    
    // 表情选择器事件
    if (emojiSelector) {
        emojiSelector.addEventListener('click', function(e) {
            const emojiCard = e.target.closest('.emoji-card');
            if (emojiCard) {
                // 移除其他选中状态
                emojiSelector.querySelectorAll('.emoji-card').forEach(card => {
                    card.classList.remove('active');
                });
                
                // 添加选中状态
                emojiCard.classList.add('active');
                
                // 更新显示的表情
                const selectedEmoji = emojiCard.dataset.emoji;
                if (modalEmojiDisplay) {
                    modalEmojiDisplay.textContent = selectedEmoji;
                }
            }
        });
    }
    
    if (messageText && charCount) {
        messageText.addEventListener('input', function() {
            charCount.textContent = this.value.length;
        });
    }
    
    if (messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const message = messageText.value.trim();
            const selectedEmoji = emojiSelector ? emojiSelector.querySelector('.emoji-card.active')?.dataset.emoji || '🎂' : '🎂';
            
            if (!message) {
                showNotification('请填写祝福内容', 'error');
                return;
            }
            
            submitMessage('匿名朋友', message, selectedEmoji);
        });
    }
});

// 提交留言
async function submitMessage(name, message, emoji) {
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                message: message,
                emoji: emoji
            })
        });

        if (response.ok) {
            const data = await response.json();
            showNotification('祝福发送成功！', 'success');
            closeMessageModal();
            
            // 显示感谢弹窗
            showThankYouModal(data.red_packet_code);
            
            loadMessages(); // 重新加载消息
        } else {
            throw new Error('发送失败');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('发送失败，请重试', 'error');
    }
}

// 加载留言
async function loadMessages() {
    try {
        const response = await fetch('/api/messages');
        if (response.ok) {
            const data = await response.json();
            messages = Array.isArray(data) ? data : (data.messages || []); // 兼容不同的API响应格式
            loadBirthdayData();
            
            // 异步更新弹幕消息，不影响当前显示
            if (messages.length > 0) {
                danmakuMessages = [...defaultMessages, ...messages];
                console.log('弹幕消息已更新，包含真实留言:', danmakuMessages.length);
            }
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// 记录访问
async function recordVisit() {
    try {
        await fetch('/api/visit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                page: 'birthday',
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        console.error('Error recording visit:', error);
    }
}

// 通知系统
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// HTML转义
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// 显示感谢弹窗
function showThankYouModal(redPacketCode) {
    // 创建弹窗HTML
    const modalHTML = `
        <div class="thank-you-modal" id="thankYouModal">
            <div class="thank-you-content">
                <div class="thank-you-icon">🎉</div>
                <h2 class="thank-you-title">感谢您的祝福！</h2>
                <p class="thank-you-message">您的生日祝福已经成功发送，谢谢您的温暖话语！</p>
                
                ${redPacketCode ? `
                    <div class="red-packet-section">
                        <div class="red-packet-icon">🧧</div>
                        <h3 class="red-packet-title">恭喜获得支付宝红包！</h3>
                        <div class="red-packet-code" onclick="copyRedPacketCode('${redPacketCode}')">${redPacketCode}</div>
                        <p class="copy-hint">点击口令即可复制，打开支付宝搜索口令红包输入口令即可使用</p>
                    </div>
                ` : `
                    <div class="no-red-packet">
                        很遗憾这次没有获得红包，但您的祝福是最珍贵的礼物！❤️
                    </div>
                `}
                
                <button class="close-button" onclick="closeThankYouModal()">关闭</button>
            </div>
        </div>
    `;
    
    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 显示弹窗
    setTimeout(() => {
        document.getElementById('thankYouModal').classList.add('show');
    }, 100);
}

// 关闭感谢弹窗
function closeThankYouModal() {
    const modal = document.getElementById('thankYouModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// 复制红包口令
function copyRedPacketCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showNotification('红包口令已复制！快去支付宝使用吧 🎉', 'success');
    }).catch(() => {
        showNotification('复制失败，请手动复制', 'error');
    });
}

// 纯自动播放音乐功能
function initMusicBox() {
    const musicDiscCorner = document.getElementById('musicDiscCorner');
    const musicDiscSimple = document.getElementById('musicDiscSimple');
    const backgroundMusic = document.getElementById('backgroundMusic');
    
    if (!musicDiscCorner || !musicDiscSimple || !backgroundMusic) {
        console.error('音乐盒元素未找到:', {
            musicDiscCorner: !!musicDiscCorner,
            musicDiscSimple: !!musicDiscSimple,
            backgroundMusic: !!backgroundMusic
        });
        return;
    }
    
    console.log('音乐盒初始化成功');
    let isPlaying = false;
    
    // 预加载音频并设置循环播放
    backgroundMusic.preload = 'auto';
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.6;
    
    // 保持音乐盒可见但移除点击功能
    musicDiscCorner.style.pointerEvents = 'none';
    
    function playMusic() {
        const playPromise = backgroundMusic.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isPlaying = true;
                musicDiscSimple.classList.add('rotating');
                console.log('音乐自动播放成功');
            }).catch(error => {
                console.log('音乐播放失败:', error);
                // 如果自动播放失败，等待用户交互后再次尝试
                setupFallbackAutoPlay();
            });
        }
    }
    
    // 强化自动播放策略
    function attemptAutoPlay() {
        console.log('尝试自动播放音乐');
        
        // 策略1: 直接播放
        playMusic();
        
        // 策略2: 静音播放然后取消静音
        setTimeout(() => {
            if (!isPlaying) {
                console.log('尝试静音播放策略');
                backgroundMusic.muted = true;
                backgroundMusic.volume = 0;
                
                const playPromise = backgroundMusic.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        setTimeout(() => {
                            backgroundMusic.muted = false;
                            backgroundMusic.volume = 0.6;
                            if (!backgroundMusic.paused) {
                                isPlaying = true;
                                musicDiscSimple.classList.add('rotating');
                                console.log('静音播放策略成功');
                            }
                        }, 200);
                    }).catch(() => {
                        backgroundMusic.muted = false;
                        backgroundMusic.volume = 0.6;
                        console.log('静音播放也失败，设置备用机制');
                        setupFallbackAutoPlay();
                    });
                }
            }
        }, 500);
        
        // 策略3: 更激进的自动播放尝试
        setTimeout(() => {
            if (!isPlaying) {
                console.log('尝试更激进的播放策略');
                backgroundMusic.currentTime = 0;
                backgroundMusic.volume = 0.1;
                backgroundMusic.muted = false;
                
                // 创建用户交互事件来触发播放
                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(clickEvent);
                
                setTimeout(() => {
                    playMusic();
                }, 100);
            }
        }, 1000);
    }
    
    // 备用自动播放机制 - 等待用户交互
    function setupFallbackAutoPlay() {
        if (isPlaying) return;
        
        console.log('设置备用自动播放机制');
        const events = ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'];
        
        function handleFirstInteraction() {
            console.log('检测到用户交互，尝试播放音乐');
            if (!isPlaying) {
                playMusic();
            }
            // 移除所有监听器
            events.forEach(event => {
                document.removeEventListener(event, handleFirstInteraction);
            });
        }
        
        events.forEach(event => {
            document.addEventListener(event, handleFirstInteraction, { once: true, passive: true });
        });
    }
    
    // 页面可见性变化处理
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible' && !isPlaying) {
            setTimeout(() => {
                console.log('页面重新可见，尝试播放音乐');
                playMusic();
            }, 500);
        }
    });
    
    // 音乐结束事件（虽然设置了loop，但作为备用）
    backgroundMusic.addEventListener('ended', function() {
        console.log('音乐结束，重新播放');
        playMusic();
    });
    
    // 立即开始尝试自动播放
    setTimeout(() => {
        attemptAutoPlay();
    }, 100);
    
    // 多次重试机制
    const retryIntervals = [1000, 3000, 6000, 10000];
    retryIntervals.forEach(delay => {
        setTimeout(() => {
            if (!isPlaying) {
                console.log(`${delay}ms后重试播放`);
                attemptAutoPlay();
            }
        }, delay);
    });
    
    // 添加页面加载完成后的额外尝试
    if (document.readyState === 'complete') {
        setTimeout(() => {
            if (!isPlaying) {
                console.log('页面完全加载后尝试播放');
                attemptAutoPlay();
            }
        }, 2000);
    } else {
        window.addEventListener('load', () => {
            setTimeout(() => {
                if (!isPlaying) {
                    console.log('window load事件后尝试播放');
                    attemptAutoPlay();
                }
            }, 1000);
        });
    }
}
