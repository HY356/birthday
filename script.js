// 全局变量
let messages = [];
let selectedEmoji = '🎂';
let messagesContainer;
let totalMessagesElement;
let totalVisitorsElement;
let currentSection = 0;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    messagesContainer = document.getElementById('messagesContainer');
    totalMessagesElement = document.getElementById('totalMessages');
    totalVisitorsElement = document.getElementById('totalVisitors');
    
    // 页面加载完成后添加淡入效果
    setTimeout(() => {
        document.body.classList.add('page-fade-in');
    }, 100);
    
    // 初始化组件
    initializeNavigation();
    initializeEmojiSelector();
    
    // 初始化倒计时
    initializeCountdown();
    
    // 初始化时间线
    initializeTimeline();
    
    // 确保首页内容立即显示
    const homeSection = document.getElementById('section-0');
    const homeAnimateElements = homeSection.querySelectorAll('.animate-in');
    homeAnimateElements.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
        el.style.visibility = 'visible';
    });
    
    // 初始化弹幕系统
    initializeDanmaku();
    
    loadMessages();
    
    // 表单提交事件
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', handleFormSubmit);
    }
    
    // 弹窗表单提交事件
    const modalMessageForm = document.getElementById('modalMessageForm');
    if (modalMessageForm) {
        modalMessageForm.addEventListener('submit', handleModalFormSubmit);
    }
    
    // 弹窗表情选择器
    initializeModalEmojiSelector();
    
    // 字符计数器
    const modalMessage = document.getElementById('modalMessage');
    const charCount = document.getElementById('charCount');
    if (modalMessage && charCount) {
        modalMessage.addEventListener('input', function() {
            charCount.textContent = this.value.length;
        });
    }
});

// 导航系统
function initializeNavigation() {
    // 禁用所有滚动和导航功能，只保留主页
    document.addEventListener('wheel', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('touchstart', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
        }
    });
}

// 时间线功能
function initializeTimeline() {
    function updateTimeline() {
        const now = new Date();
        const currentYear = now.getFullYear();
        
        // 23岁生日 (去年9月12日)
        const age23Birthday = new Date(currentYear - 1, 8, 12, 0, 0, 0);
        // 24岁生日 (今年9月12日)
        let age24Birthday = new Date(currentYear, 8, 12, 0, 0, 0);
        
        // 如果今年生日已过，则计算到明年25岁
        if (now > age24Birthday) {
            age24Birthday = new Date(currentYear + 1, 8, 12, 0, 0, 0);
        }
        
        // 计算从23岁到24岁的总时长
        const totalDuration = age24Birthday - age23Birthday;
        // 计算已经过去的时长
        const elapsed = now - age23Birthday;
        // 计算进度百分比
        const progress = Math.min(Math.max(elapsed / totalDuration * 100, 0), 100);
        
        // 更新时间线进度
        const progressBar = document.getElementById('timelineProgress');
        const progressText = document.getElementById('progressText');
        
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
        
        if (progressText) {
            const daysLeft = Math.ceil((age24Birthday - now) / (1000 * 60 * 60 * 24));
            if (daysLeft > 0) {
                progressText.textContent = `距离24岁还有 ${daysLeft} 天 · ${daysLeft} days to 24`;
            } else {
                progressText.textContent = '已经24岁了！🎉 · Already 24! 🎉';
            }
        }
    }
    
    updateTimeline();
    setInterval(updateTimeline, 60000); // 每分钟更新一次
}

// 过渡到生日页面
function transitionToBirthdayPage() {
    // 创建过渡遮罩层
    const transitionOverlay = document.createElement('div');
    transitionOverlay.className = 'page-transition-overlay';
    transitionOverlay.innerHTML = `
        <div class="transition-content">
            <div class="transition-icon">🎂</div>
            <h2 class="transition-title">生日快乐！</h2>
            <p class="transition-subtitle">正在为您准备生日庆祝页面...</p>
            <div class="transition-loader"></div>
            <div class="transition-progress">
                <div class="transition-progress-bar" id="transitionProgressBar"></div>
            </div>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(transitionOverlay);
    
    // 开始过渡动画
    setTimeout(() => {
        transitionOverlay.classList.add('active');
        document.body.classList.add('page-fade-out');
        
        // 启动进度条动画
        const progressBar = document.getElementById('transitionProgressBar');
        if (progressBar) {
            setTimeout(() => {
                progressBar.style.width = '100%';
            }, 200);
        }
    }, 100);
    
    // 2.5秒后跳转到生日页面
    setTimeout(() => {
        window.location.href = '/birthday';
    }, 2500);
}

// 测试生日效果函数 - 跳转到生日页面
function triggerBirthdayTest() {
    // 使用过渡动画跳转到生日页面
    transitionToBirthdayPage();
}

// 创建生日页面
function createBirthdayPage() {
    const scrollContainer = document.getElementById('scrollContainer');
    
    // 创建生日页面HTML
    const birthdayPageHTML = `
        <section class="page-section birthday-page active" id="birthday-section">
            <div class="birthday-hero">
                <div class="birthday-background">
                    <div class="floating-elements">
                        <div class="floating-element element-1"></div>
                        <div class="floating-element element-2"></div>
                        <div class="floating-element element-3"></div>
                        <div class="floating-element element-4"></div>
                        <div class="floating-element element-5"></div>
                    </div>
                </div>
                
                <div class="birthday-content">
                    <div class="birthday-badge animate-in">🎂 生日快乐 · Happy Birthday</div>
                    <h1 class="birthday-title animate-in">今天是我的生日！🎂<br><span class="english-subtitle">It's My Birthday Today!</span></h1>
                    <p class="birthday-subtitle animate-in">感谢所有朋友的祝福，让这一天变得更加特别<br><span class="english-text">Thank you for making this day extra special</span></p>
                    
                    <!-- 生日庆祝区域 -->
                    <div class="birthday-celebration animate-in">
                        <div class="celebration-message">🎉 生日快乐！🎉</div>
                        <div class="age-display">
                            <span class="age-number">24</span>
                            <span class="age-text">岁啦！</span>
                        </div>
                    </div>
                    
                    <!-- 生日特效 -->
                    <div class="birthday-effects active" id="birthdayEffects">
                        <div class="confetti-container" id="confettiContainer"></div>
                        <div class="balloons-container" id="balloonsContainer">
                            <div class="balloon balloon-1">🎈</div>
                            <div class="balloon balloon-2">🎈</div>
                            <div class="balloon balloon-3">🎈</div>
                            <div class="balloon balloon-4">🎈</div>
                            <div class="balloon balloon-5">🎈</div>
                        </div>
                    </div>
                    
                    <!-- 生日祝福展示 -->
                    <div class="birthday-wishes animate-in">
                        <h3>收到的祝福 · Birthday Wishes</h3>
                        <div class="wishes-stats">
                            <div class="stat-item">
                                <span class="stat-number" id="birthdayTotalMessages">0</span>
                                <span class="stat-label">条祝福</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number" id="birthdayTotalVisitors">0</span>
                                <span class="stat-label">位朋友</span>
                            </div>
                        </div>
                        <div class="wishes-container" id="birthdayMessagesContainer">
                            <!-- 祝福消息将在这里显示 -->
                        </div>
                    </div>
                    
                    <div class="birthday-actions animate-in">
                        <button class="action-btn primary" onclick="openMessageModal()">
                            <span>继续送祝福 · Send More Wishes</span>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M6 12l4-4-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <button class="action-btn secondary" onclick="returnToHome()">
                            <span>返回首页 · Back to Home</span>
                        </button>
                    </div>
                    
                    <!-- 弹幕容器 -->
                    <div class="danmaku-container" id="birthdayDanmakuContainer"></div>
                </div>
            </div>
        </section>
    `;
    
    // 隐藏原页面
    const originalSection = document.getElementById('section-0');
    originalSection.style.display = 'none';
    
    // 添加生日页面
    scrollContainer.innerHTML += birthdayPageHTML;
    
    // 启动生日特效
    setTimeout(() => {
        // 确保先重置彩纸状态
        window.confettiStopped = false;
        startBirthdayEffects();
        loadBirthdayData();
        triggerBirthdayAnimations();
    }, 500);
}

// 返回首页函数
function returnToHome() {
    const birthdaySection = document.getElementById('birthday-section');
    const originalSection = document.getElementById('section-0');
    
    if (birthdaySection) {
        birthdaySection.remove();
    }
    
    if (originalSection) {
        originalSection.style.display = 'flex';
    }
    
    // 停止彩纸动画
    stopConfetti();
    
    showNotification('已返回首页 · Back to Home', 'info');
}

// 加载生日页面数据
function loadBirthdayData() {
    // 更新统计数据
    document.getElementById('birthdayTotalMessages').textContent = messages.length;
    
    // 显示祝福消息
    const container = document.getElementById('birthdayMessagesContainer');
    if (messages.length === 0) {
        container.innerHTML = '<div class="no-wishes">还没有收到祝福，快邀请朋友来送祝福吧！</div>';
    } else {
        const wishesHTML = messages.slice(0, 6).map(message => `
            <div class="wish-card">
                <div class="wish-emoji">${message.emoji}</div>
                <div class="wish-content">${escapeHtml(message.message)}</div>
                <div class="wish-author">— ${escapeHtml(message.name || '匿名朋友')}</div>
            </div>
        `).join('');
        container.innerHTML = wishesHTML;
    }
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

// 倒计时功能
function initializeCountdown() {
    function updateCountdown() {
        const now = new Date();
        const currentYear = now.getFullYear();
        
        // 9月12日生日
        let birthday = new Date(currentYear, 8, 12, 0, 0, 0); // 月份从0开始，8表示9月
        
        // 如果今年的生日已经过了，计算到明年的生日
        if (now > birthday) {
            birthday = new Date(currentYear + 1, 8, 12, 0, 0, 0);
        }
        
        const timeLeft = birthday - now;
        
        // 获取页面元素
        const heroTitle = document.getElementById('heroTitle');
        const heroSubtitle = document.getElementById('heroSubtitle');
        const countdownLabel = document.getElementById('countdownLabel');
        const countdownContainer = document.getElementById('countdownContainer');
        const heroSection = document.getElementById('section-0');
        
        if (timeLeft <= 0) {
            // 生日到了 - 使用过渡动画跳转到生日页面
            transitionToBirthdayPage();
            return;
        }
        
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        // 生日前 - 显示倒计时
        heroTitle.innerHTML = '祝我生日快乐<br><span class="english-subtitle">Wishing Myself a Happy Birthday</span>';
        heroSubtitle.innerHTML = '期待收到你们的温暖祝福<br><span class="english-text">Looking forward to your warm wishes</span>';
        
        // 显示完整的倒计时：天-小时-分钟-秒
        countdownLabel.textContent = '距离生日还有 · Time Remaining';
        document.getElementById('days').textContent = days.toString().padStart(2, '0');
        document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
    }
    
    // 立即更新一次
    updateCountdown();
    
    // 每秒更新
    setInterval(updateCountdown, 1000);
}

// 生日特效
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
    
    // 启动弹幕
    startDanmaku();
}

function createConfetti() {
    // 尝试找到彩纸容器，如果不存在就创建一个全局的
    let confettiContainer = document.getElementById('confettiContainer');
    
    if (!confettiContainer) {
        // 创建全局彩纸容器
        confettiContainer = document.createElement('div');
        confettiContainer.id = 'confettiContainer';
        confettiContainer.className = 'confetti-container';
        document.body.appendChild(confettiContainer);
        console.log('Created global confetti container');
    }
    
    console.log('Creating confetti...');
    
    // 创建80个彩纸片，增加密度
    for (let i = 0; i < 80; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (Math.random() * 3 + 4) + 's';
        
        // 确保彩纸从页面顶部外面开始，使用更大的范围
        confetti.style.top = '-200px';
        
        // 添加随机的水平偏移
        confetti.style.transform = `translateX(${(Math.random() - 0.5) * 100}px)`;
        
        confettiContainer.appendChild(confetti);
        
        // 动画结束后移除
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 8000);
    }
    
    // 每2秒重新创建彩纸，增加频率
    setTimeout(() => {
        // 检查容器是否还存在且彩纸动画未被停止
        const container = document.getElementById('confettiContainer');
        if (container && !window.confettiStopped) {
            createConfetti();
        }
    }, 2000);
}

// 停止彩纸动画
function stopConfetti() {
    window.confettiStopped = true;
    const confettiContainer = document.getElementById('confettiContainer');
    if (confettiContainer) {
        // 清空容器内容而不是删除容器本身
        confettiContainer.innerHTML = '';
        confettiContainer.remove();
    }
}

// 启动彩纸动画
function startConfetti() {
    // 重置状态并启动新的彩纸动画
    window.confettiStopped = false;
    // 延迟一点启动，确保DOM准备好
    setTimeout(() => {
        createConfetti();
    }, 100);
}

// 弹幕系统
let danmakuMessages = [];
let danmakuContainer;

// 预设祝福语
const defaultMessages = [
    { "message": "岁华二十四，星辉为你加冕。", emoji: "👑" },
    { "message": "廿四芳辰，宇宙为你点亮光年。", emoji: "✨" },
    { "message": "你降临的第24次春分，万物为你称臣。", emoji: "🌿" },
    { "message": "时间把第24颗珍珠镶进你眼眸。", emoji: "🤍" },
    { "message": "二十四阕诗，写不尽你锋芒与温柔。", emoji: "🖋️" },
    { "message": "世界在你24圈光晕里悄然对焦。", emoji: "🌐" },
    { "message": "此刻银河以你为轴，潮汐为你和声。", emoji: "🌌" },
    { "message": "二十四道晨曦，皆化作你的前缀。", emoji: "🌅" },
    { "message": "你携24载山海，自成风向与坐标。", emoji: "🧭" },
    { "message": "生命把第24颗镭射心跳藏进你掌心。", emoji: "💎" },
    { "message": "廿四载霜雪，炼成你眸底的澄澈。", emoji: "🔮" },
    { "message": "二十四重宇宙，在你眉间同时亮起。", emoji: "🌠" }
  ];

function initializeDanmaku() {
    danmakuContainer = document.getElementById('danmakuContainer');
    
    if (!danmakuContainer) {
        console.error('弹幕容器未找到');
        return;
    }
    
    console.log('弹幕容器找到:', danmakuContainer);
    
    // 先使用预设祝福语
    danmakuMessages = [...defaultMessages];
    console.log('预设祝福语加载完成:', danmakuMessages.length);
    
    // 如果已有真实消息，立即合并
    if (messages.length > 0) {
        danmakuMessages = [...defaultMessages, ...messages];
        console.log('真实消息已合并:', danmakuMessages.length);
    }
    
    // 直接启动弹幕，不依赖API
    startDanmaku();
    
    // 异步获取真实祝福消息
    fetch('/api/messages')
        .then(response => response.json())
        .then(data => {
            const realMessages = Array.isArray(data) ? data : (data.messages || []);
            if (realMessages.length > 0) {
                // 合并预设和真实祝福
                danmakuMessages = [...defaultMessages, ...realMessages];
                console.log('真实祝福合并完成，总数:', danmakuMessages.length);
                // 更新全局messages变量
                messages = realMessages;
            }
        })
        .catch(error => {
            console.log('获取弹幕数据失败，继续使用预设祝福:', error);
        });
}

function createDanmakuItem(message) {
    const danmakuItem = document.createElement('div');
    danmakuItem.className = 'danmaku-item';
    danmakuItem.setAttribute('data-emoji', message.emoji || '🎂');
    danmakuItem.textContent = message.message;
    
    // 随机垂直位置（全屏范围）
    const minTop = 10;
    const maxTop = 85;
    const randomTop = Math.random() * (maxTop - minTop) + minTop;
    danmakuItem.style.top = randomTop + '%';
    
    // 随机动画持续时间（20-30秒，更慢更稳定）
    const duration = Math.random() * 10 + 20;
    danmakuItem.style.animationDuration = duration + 's';
    
    // 确保元素可见
    danmakuItem.style.left = '100%';
    danmakuItem.style.zIndex = '100';
    
    console.log('创建弹幕元素:', {
        text: danmakuItem.textContent,
        top: danmakuItem.style.top,
        duration: danmakuItem.style.animationDuration
    });
    
    return danmakuItem;
}

function startDanmaku() {
    if (!danmakuMessages.length || !danmakuContainer) {
        console.log('弹幕初始化失败:', { messagesLength: danmakuMessages.length, container: !!danmakuContainer });
        return;
    }
    
    console.log('弹幕系统启动，消息数量:', danmakuMessages.length);
    
    function showRandomDanmaku() {
        // 只在首页显示弹幕
        if (currentSection !== 0) return;
        
        const randomMessage = danmakuMessages[Math.floor(Math.random() * danmakuMessages.length)];
        const danmakuItem = createDanmakuItem(randomMessage);
        
        console.log('显示弹幕:', randomMessage.name, randomMessage.message);
        console.log('弹幕元素:', danmakuItem);
        
        danmakuContainer.appendChild(danmakuItem);
        
        // 强制触发重排以确保动画开始
        danmakuItem.offsetHeight;
        
        // 动画结束后移除元素
        danmakuItem.addEventListener('animationend', () => {
            if (danmakuItem.parentNode) {
                danmakuItem.parentNode.removeChild(danmakuItem);
            }
        });
        
        // 备用清理机制（根据动画时长计算）
        const duration = parseFloat(danmakuItem.style.animationDuration) || 25;
        setTimeout(() => {
            if (danmakuItem.parentNode) {
                danmakuItem.parentNode.removeChild(danmakuItem);
            }
        }, (duration + 2) * 1000);
    }
    
    // 立即创建多个弹幕，让页面加载后就有弹幕
    showRandomDanmaku(); // 立即创建第一个
    setTimeout(() => showRandomDanmaku(), 200);
    setTimeout(() => showRandomDanmaku(), 400);
    setTimeout(() => showRandomDanmaku(), 600);
    
    // 每4-8秒显示一条弹幕
    function scheduleDanmaku() {
        const interval = Math.random() * 4000 + 4000; // 4-8秒
        setTimeout(() => {
            showRandomDanmaku();
            scheduleDanmaku();
        }, interval);
    }
    
    // 开始弹幕循环
    scheduleDanmaku();
    
    // 每1-2秒显示一个弹幕，更密集
    setInterval(showRandomDanmaku, Math.random() * 1000 + 1000);
    
    // 额外的弹幕流
    setTimeout(() => {
        setInterval(showRandomDanmaku, Math.random() * 1500 + 1500);
    }, 500);
}

// 弹窗功能
function openMessageModal() {
    const modal = document.getElementById('messageModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMessageModal() {
    const modal = document.getElementById('messageModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // 清空表单
    const form = document.getElementById('modalMessageForm');
    if (form) {
        form.reset();
        // 重置表情选择器
        const emojiCards = document.querySelectorAll('#modalEmojiSelector .emoji-card');
        emojiCards.forEach(card => card.classList.remove('active'));
        emojiCards[0].classList.add('active');
        selectedEmoji = '🎂';
        
        // 重置顶部表情显示
        const modalEmojiDisplay = document.getElementById('modalEmojiDisplay');
        if (modalEmojiDisplay) {
            modalEmojiDisplay.textContent = '🎂';
        }
    }
}

// 弹窗表情选择器
function initializeModalEmojiSelector() {
    const emojiCards = document.querySelectorAll('#modalEmojiSelector .emoji-card');
    const modalEmojiDisplay = document.getElementById('modalEmojiDisplay');
    
    emojiCards.forEach(card => {
        card.addEventListener('click', function() {
            // 移除所有活跃状态
            emojiCards.forEach(c => c.classList.remove('active'));
            
            // 添加当前选中状态
            this.classList.add('active');
            
            // 更新选中的表情
            selectedEmoji = this.dataset.emoji;
            
            // 更新顶部显示的表情图标
            if (modalEmojiDisplay) {
                modalEmojiDisplay.textContent = selectedEmoji;
            }
        });
    });
}

// 弹窗表单提交
async function handleModalFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const messageData = {
        name: '匿名朋友', // 固定使用匿名
        message: formData.get('message').trim(),
        emoji: selectedEmoji
    };
    
    // 验证输入
    if (!messageData.message) {
        alert('请填写祝福内容');
        return;
    }
    
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 关闭弹窗
            closeMessageModal();
            
            // 显示感谢弹窗
            showThankYouModal(data.red_packet_code);
            
            // 重新加载留言
            loadMessages();
        } else {
            showNotification('发送失败，请重试', 'error');
        }
    } catch (error) {
        console.error('提交留言失败:', error);
        showNotification('网络错误，请重试', 'error');
    }
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
                        <p class="copy-hint">点击口令即可复制，然后打开支付宝使用</p>
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


// 复制红包口令
function copyRedPacketCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showNotification('红包口令已复制！快去支付宝使用吧 🎉', 'success');
    }).catch(() => {
        showNotification('复制失败，请手动复制', 'error');
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化倒计时
    initializeCountdown();
    
    // 初始化弹幕
    initializeDanmaku();
    
    
    // 初始化音乐盒
    initMusicBox();
});

// 简化音乐盒功能
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
    
    // 点击切换播放/暂停
    musicDiscCorner.addEventListener('click', function() {
        if (isPlaying) {
            pauseMusic();
        } else {
            playMusic();
        }
    });
    
    function playMusic() {
        backgroundMusic.volume = 1; // 确保音量正常
        backgroundMusic.play().then(() => {
            isPlaying = true;
            musicDiscSimple.classList.add('rotating');
            console.log('音乐开始播放');
        }).catch(error => {
            console.log('音乐播放失败:', error);
            // 如果自动播放失败，等待用户交互
        });
    }
    
    function pauseMusic() {
        backgroundMusic.pause();
        isPlaying = false;
        musicDiscSimple.classList.remove('rotating');
    }
    
    // 强制自动播放 - 绕过浏览器限制
    function forceAutoPlay() {
        console.log('开始强制自动播放');
        
        // 设置音量为0.1开始播放，然后逐渐增加音量
        backgroundMusic.volume = 0.1;
        backgroundMusic.muted = false;
        backgroundMusic.currentTime = 0;
        
        // 尝试播放
        const playPromise = backgroundMusic.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isPlaying = true;
                musicDiscSimple.classList.add('rotating');
                
                // 逐渐增加音量
                let volume = 0.1;
                const fadeIn = setInterval(() => {
                    if (volume < 1) {
                        volume += 0.05;
                        backgroundMusic.volume = Math.min(volume, 1);
                    } else {
                        clearInterval(fadeIn);
                    }
                }, 100);
                
                console.log('音乐自动播放成功，音量:', backgroundMusic.volume);
            }).catch(error => {
                console.log('自动播放被阻止:', error);
                // 如果自动播放失败，等待用户交互
                document.addEventListener('click', function() {
                    if (!isPlaying) {
                        console.log('用户点击后尝试播放');
                        playMusic();
                    }
                }, { once: true });
            });
        }
    }
    
    // 立即尝试自动播放
    console.log('准备自动播放音乐');
    forceAutoPlay();
    
    // 多重备用机制
    setTimeout(() => {
        if (!isPlaying) {
            console.log('第一次备用尝试');
            forceAutoPlay();
        }
    }, 500);
    
    setTimeout(() => {
        if (!isPlaying) {
            console.log('第二次备用尝试');
            playMusic();
        }
    }, 1500);
    
    // 监听用户交互
    document.addEventListener('click', function() {
        if (!isPlaying) {
            console.log('用户点击触发播放');
            playMusic();
        }
    }, { once: true });
    
    // 监听键盘交互
    document.addEventListener('keydown', function() {
        if (!isPlaying) {
            console.log('用户按键触发播放');
            playMusic();
        }
    }, { once: true });
    
    // 监听音乐结束事件
    backgroundMusic.addEventListener('ended', function() {
        if (backgroundMusic.loop && isPlaying) {
            playMusic();
        }
    });
}

// 禁用页面切换功能，只保留主页
function switchToSection(sectionIndex) {
    // 只允许停留在主页
    return;
}

function triggerSectionAnimations(sectionEl) {
    if (!sectionEl) return;
    
    const animateElements = sectionEl.querySelectorAll('.animate-in');
    
    // 对于首页，直接显示内容
    if (sectionEl.id === 'section-0') {
        animateElements.forEach((el) => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            el.style.transition = 'all 0.8s ease-out';
        });
        return;
    }
    
    // 其他页面使用动画
    animateElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            el.style.transition = 'all 0.8s ease-out';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100 + 100);
    });
}

// 滚动到表单区域
function scrollToForm() {
    const formSection = document.querySelector('.form-section');
    formSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// 初始化滚动效果
function initScrollEffects() {
    // 滚动视差效果
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.floating-element');
        
        parallaxElements.forEach((element, index) => {
            const speed = 0.5 + (index * 0.1);
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px) rotate(${scrolled * 0.1}deg)`;
        });
        
        // 滚动指示器淡出
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            const opacity = Math.max(0, 1 - scrolled / 300);
            scrollIndicator.style.opacity = opacity;
        }
    });
    
    // 元素进入视口动画
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
            }
        });
    }, observerOptions);
    
    // 观察需要动画的元素
    document.querySelectorAll('.message-card, .form-wrapper').forEach(el => {
        observer.observe(el);
    });
}

// 表情选择器初始化
function initializeEmojiSelector() {
    const emojiCards = document.querySelectorAll('.emoji-card');
    const selectedEmojiInput = document.getElementById('selectedEmoji');
    
    emojiCards.forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有活跃状态
            emojiCards.forEach(opt => opt.classList.remove('active'));
            
            // 添加活跃状态到当前选择
            this.classList.add('active');
            
            // 更新选中的表情
            selectedEmoji = this.dataset.emoji;
            selectedEmojiInput.value = selectedEmoji;
        });
    });
}

// 处理表单提交
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(messageForm);
    const messageData = {
        name: formData.get('name').trim(),
        message: formData.get('message').trim(),
        emoji: selectedEmoji,
        timestamp: new Date().toISOString()
    };
    
    // 验证数据
    if (!messageData.name || !messageData.message) {
        showNotification('请填写完整信息！', 'error');
        return;
    }
    
    // 显示加载状态
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';
    submitBtn.disabled = true;
    
    try {
        // 发送到后端
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('祝福发送成功！🎉', 'success');
            
            // 重置表单
            messageForm.reset();
            
            // 重新加载留言
            loadMessages();
            
            // 触发庆祝效果
            triggerCelebration();
        } else {
            throw new Error('发送失败');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('发送失败，请稍后重试', 'error');
    } finally {
        // 恢复按钮状态
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// 加载留言
async function loadMessages() {
    try {
        const response = await fetch('/api/messages');
        if (response.ok) {
            const data = await response.json();
            messages = data.messages || [];
            renderMessages();
        } else {
            renderNoMessages();
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        renderNoMessages();
    }
}

// 渲染留言
function renderMessages() {
    if (!messagesContainer) return;
    
    if (messages.length === 0) {
        renderNoMessages();
        return;
    }
    
    const messagesHTML = messages.map(message => {
        const date = new Date(message.timestamp);
        const timeString = date.toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // 生成头像字母
        const avatarLetter = message.name.charAt(0).toUpperCase();
        
        return `
            <div class="message-card">
                <div class="message-header">
                    <div class="message-author">
                        <div class="author-avatar">${avatarLetter}</div>
                        <div class="author-info">
                            <div class="author-name">${escapeHtml(message.name)}</div>
                        </div>
                    </div>
                    <div class="message-meta">
                        <span class="message-emoji">${message.emoji}</span>
                        <span class="message-time">${timeString}</span>
                    </div>
                </div>
                <div class="message-content">${escapeHtml(message.message)}</div>
            </div>
        `;
    }).join('');
    
    messagesContainer.innerHTML = messagesHTML;
}

// 渲染无留言状态
function renderNoMessages() {
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = `
        <div class="no-messages">
            <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M24 4C35.046 4 44 12.954 44 24C44 35.046 35.046 44 24 44C12.954 44 4 35.046 4 24C4 12.954 12.954 4 24 4Z" stroke="currentColor" stroke-width="2"/>
                    <path d="M16 24L22 30L32 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h3>还没有祝福</h3>
            <p>成为第一个送出温暖祝福的人吧</p>
        </div>
    `;
}

// 更新统计信息
function updateStats(stats) {
    // Update all message count displays
    const messageCountElements = document.querySelectorAll('#totalMessages, #homeMessages');
    messageCountElements.forEach(el => {
        if (el) el.textContent = stats.totalMessages || messages.length;
    });
    
    if (totalVisitorsElement) {
        totalVisitorsElement.textContent = stats.totalVisitors || 0;
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `<span>${message}</span>`;
    
    // Apple风格通知样式
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: type === 'success' ? 'var(--success)' : type === 'error' ? '#ff3b30' : 'var(--accent)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        zIndex: '10000',
        fontSize: '15px',
        fontWeight: '500',
        transform: 'translateX(100%)',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(20px)',
        fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif'
    });
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动移除
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 触发庆祝效果 - Apple风格简化版
function triggerCelebration() {
    // 简单的成功反馈，符合Apple的简约风格
    showNotification('祝福发送成功！🎉', 'success');
}

// HTML 转义函数
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

// 页面可见性变化时的处理
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // 页面重新可见时刷新留言
        loadMessages();
    }
});

// 定期刷新留言（每30秒）
setInterval(() => {
    if (!document.hidden) {
        loadMessages();
    }
}, 30000);
