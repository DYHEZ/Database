// Configuration
const CONFIG = {
    API_URL: window.location.origin + '/api',
    UPDATE_INTERVAL: 3000, // 3 seconds
    TYPING_TIMEOUT: 3000, // 3 seconds
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    EMOJIS: {
        smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
        people: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝'],
        animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄'],
        food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦'],
        objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠'],
        symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️']
    }
};

// State Management
let state = {
    currentUser: {
        id: null,
        username: null,
        color: '#3B82F6',
        avatarLetter: 'U'
    },
    currentRoom: 'genel',
    rooms: [],
    messages: [],
    onlineUsers: [],
    typingUsers: new Set(),
    isTyping: false,
    lastTypingTime: 0,
    socket: null,
    messageQueue: [],
    isConnected: true
};

// DOM Elements
const dom = {
    // Login
    loginModal: document.getElementById('login-modal'),
    loginUsername: document.getElementById('login-username'),
    loginColor: document.getElementById('login-color'),
    loginButton: document.getElementById('login-button'),
    
    // User
    userAvatar: document.getElementById('user-avatar'),
    avatarLetter: document.getElementById('avatar-letter'),
    usernameDisplay: document.getElementById('username-display'),
    userStatus: document.getElementById('user-status'),
    
    // Rooms
    roomsList: document.getElementById('rooms-list'),
    currentRoomName: document.getElementById('current-room-name'),
    currentRoomDescription: document.getElementById('current-room-description'),
    
    // Messages
    messagesContainer: document.getElementById('messages-container'),
    messageInput: document.getElementById('message-input'),
    sendButton: document.getElementById('send-button'),
    charCount: document.getElementById('char-count'),
    
    // Online Users
    onlineUsersList: document.getElementById('online-users'),
    onlineCount: document.getElementById('online-count'),
    
    // Stats
    totalMessages: document.getElementById('total-messages'),
    totalUsers: document.getElementById('total-users'),
    totalRooms: document.getElementById('total-rooms'),
    
    // Right Panel
    panelRoomName: document.getElementById('panel-room-name'),
    panelRoomDescription: document.getElementById('panel-room-description'),
    roomMessageCount: document.getElementById('room-message-count'),
    roomMemberCount: document.getElementById('room-member-count'),
    roomCreatedDate: document.getElementById('room-created-date'),
    roomMembersList: document.getElementById('room-members-list'),
    
    // Modals
    createRoomModal: document.getElementById('create-room-modal'),
    createRoomBtn: document.getElementById('create-room-btn'),
    roomNameInput: document.getElementById('room-name'),
    roomDescriptionInput: document.getElementById('room-description'),
    createRoomConfirm: document.getElementById('create-room-confirm'),
    
    // Emoji Picker
    emojiPicker: document.getElementById('emoji-picker'),
    emojiGrid: document.getElementById('emoji-grid'),
    emojiBtn: document.getElementById('emoji-btn'),
    
    // File Upload
    fileUploadBtn: document.getElementById('file-upload-btn'),
    
    // Notifications
    notificationContainer: document.getElementById('notification-container'),
    
    // Server Status
    serverStatus: document.getElementById('server-status')
};

// Initialize Application
async function initApp() {
    console.log('🚀 ProChat başlatılıyor...');
    
    // Load user from localStorage
    loadUserFromStorage();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize emoji picker
    initEmojiPicker();
    
    // Check API connection
    await checkConnection();
    
    // If user exists, start app
    if (state.currentUser.id) {
        startApp();
    } else {
        showLoginModal();
    }
}

// Load user from localStorage
function loadUserFromStorage() {
    const savedUser = localStorage.getItem('prochat_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            state.currentUser = {
                ...state.currentUser,
                ...user,
                id: user.id || generateUserId()
            };
            
            // Update UI
            updateUserUI();
        } catch (error) {
            console.error('Kullanıcı bilgileri yüklenemedi:', error);
        }
    } else {
        // Generate new user ID
        state.currentUser.id = generateUserId();
    }
}

// Generate unique user ID
function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

// Setup event listeners
function setupEventListeners() {
    // Login
    dom.loginButton.addEventListener('click', handleLogin);
    dom.loginUsername.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    // Message input
    dom.messageInput.addEventListener('input', handleMessageInput);
    dom.messageInput.addEventListener('keydown', handleMessageKeydown);
    dom.sendButton.addEventListener('click', sendMessage);
    
    // Emoji picker
    dom.emojiBtn.addEventListener('click', toggleEmojiPicker);
    
    // File upload
    dom.fileUploadBtn.addEventListener('click', handleFileUpload);
    
    // Room creation
    dom.createRoomBtn.addEventListener('click', () => showModal('create-room-modal'));
    dom.createRoomConfirm.addEventListener('click', createRoom);
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
        });
    });
    
    // Avatar color selection
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            dom.loginColor.value = this.dataset.color;
        });
    });
    
    // Color picker change
    dom.loginColor.addEventListener('change', function() {
        document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
    });
    
    // Character counter
    dom.messageInput.addEventListener('input', updateCharCounter);
    
    // Formatting buttons
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            applyFormatting(this.dataset.format);
        });
    });
    
    // Window events
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);
    
    // Click outside emoji picker
    document.addEventListener('click', (e) => {
        if (!dom.emojiPicker.contains(e.target) && e.target !== dom.emojiBtn) {
            dom.emojiPicker.classList.remove('active');
        }
    });
}

// Initialize emoji picker
function initEmojiPicker() {
    // Clear emoji grid
    dom.emojiGrid.innerHTML = '';
    
    // Add emojis by category
    Object.entries(CONFIG.EMOJIS).forEach(([category, emojis]) => {
        emojis.forEach(emoji => {
            const emojiElement = document.createElement('div');
            emojiElement.className = 'emoji';
            emojiElement.textContent = emoji;
            emojiElement.dataset.category = category;
            emojiElement.addEventListener('click', () => insertEmoji(emoji));
            dom.emojiGrid.appendChild(emojiElement);
        });
    });
    
    // Category buttons
    document.querySelectorAll('.emoji-category').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            
            // Update active button
            document.querySelectorAll('.emoji-category').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Filter emojis
            document.querySelectorAll('.emoji').forEach(emoji => {
                emoji.style.display = emoji.dataset.category === category ? 'block' : 'none';
            });
        });
    });
}

// Check API connection
async function checkConnection() {
    try {
        const response = await fetch(CONFIG.API_URL + '/health');
        if (response.ok) {
            updateServerStatus('online');
            return true;
        }
    } catch (error) {
        console.error('API bağlantı hatası:', error);
        updateServerStatus('offline');
        return false;
    }
}

// Start application
async function startApp() {
    console.log('📱 Uygulama başlatılıyor...');
    
    // Hide login modal
    hideLoginModal();
    
    // Load initial data
    await Promise.all([
        loadRooms(),
        loadMessages(),
        loadOnlineUsers(),
        loadStatistics()
    ]);
    
    // Start periodic updates
    startPeriodicUpdates();
    
    // Show welcome notification
    showNotification('ProChat\'e hoş geldiniz!', 'success');
}

// Show login modal
function showLoginModal() {
    dom.loginModal.classList.add('active');
    dom.loginUsername.focus();
}

// Hide login modal
function hideLoginModal() {
    dom.loginModal.classList.remove('active');
}

// Handle login
function handleLogin() {
    const username = dom.loginUsername.value.trim();
    const color = dom.loginColor.value;
    
    if (!username) {
        showNotification('Lütfen bir kullanıcı adı girin', 'error');
        dom.loginUsername.focus();
        return;
    }
    
    if (username.length < 2 || username.length > 20) {
        showNotification('Kullanıcı adı 2-20 karakter arasında olmalıdır', 'error');
        return;
    }
    
    // Update user state
    state.currentUser.username = username;
    state.currentUser.color = color;
    state.currentUser.avatarLetter = username.charAt(0).toUpperCase();
    
    // Save to localStorage
    saveUserToStorage();
    
    // Update UI
    updateUserUI();
    
    // Start app
    startApp();
}

// Save user to localStorage
function saveUserToStorage() {
    localStorage.setItem('prochat_user', JSON.stringify(state.currentUser));
}

// Update user UI
function updateUserUI() {
    // Avatar
    dom.userAvatar.style.backgroundColor = state.currentUser.color;
    dom.avatarLetter.textContent = state.currentUser.avatarLetter;
    
    // Username
    dom.usernameDisplay.textContent = state.currentUser.username;
    
    // Status
    dom.userStatus.textContent = 'çevrimiçi';
}

// Load rooms
async function loadRooms() {
    try {
        const response = await fetch(CONFIG.API_URL + '/rooms');
        const rooms = await response.json();
        
        state.rooms = rooms;
        renderRoomsList();
        
        // Update current room info if needed
        if (!rooms.find(r => r.id === state.currentRoom)) {
            state.currentRoom = rooms[0]?.id || 'genel';
            await loadMessages();
        }
        
    } catch (error) {
        console.error('Odalar yüklenemedi:', error);
        showNotification('Odalar yüklenemedi', 'error');
    }
}

// Render rooms list
function renderRoomsList() {
    dom.roomsList.innerHTML = '';
    
    state.rooms.forEach(room => {
        const roomElement = document.createElement('div');
        roomElement.className = `room-item ${room.id === state.currentRoom ? 'active' : ''}`;
        roomElement.dataset.roomId = room.id;
        
        roomElement.innerHTML = `
            <div class="room-icon">
                <i class="fas fa-hashtag"></i>
            </div>
            <div class="room-info">
                <div class="room-name">${escapeHtml(room.name)}</div>
                <div class="room-stats">
                    <span><i class="fas fa-comment"></i> ${room.messageCount || 0}</span>
                    <span><i class="fas fa-user"></i> ${room.onlineMembers || 0}</span>
                </div>
            </div>
        `;
        
        roomElement.addEventListener('click', () => switchRoom(room.id));
        dom.roomsList.appendChild(roomElement);
    });
}

// Switch room
async function switchRoom(roomId) {
    if (roomId === state.currentRoom) return;
    
    // Update active room
    document.querySelectorAll('.room-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-room-id="${roomId}"]`)?.classList.add('active');
    
    // Update state
    state.currentRoom = roomId;
    state.messages = [];
    
    // Update UI
    const room = state.rooms.find(r => r.id === roomId);
    if (room) {
        dom.currentRoomName.textContent = room.name;
        dom.currentRoomDescription.textContent = room.description;
        
        // Update right panel
        dom.panelRoomName.textContent = room.name;
        dom.panelRoomDescription.textContent = room.description;
    }
    
    // Load messages for new room
    await loadMessages();
    
    // Load room members
    await loadRoomMembers();
    
    // Show notification
    showNotification(`${room?.name} odasına geçildi`, 'info');
}

// Load messages
async function loadMessages() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/rooms/${state.currentRoom}/messages?limit=100`);
        const data = await response.json();
        
        state.messages = data.messages;
        renderMessages();
        
        // Update room info
        dom.roomMessageCount.textContent = data.total;
        
    } catch (error) {
        console.error('Mesajlar yüklenemedi:', error);
        showNotification('Mesajlar yüklenemedi', 'error');
    }
}

// Render messages
function renderMessages() {
    dom.messagesContainer.innerHTML = '';
    
    if (state.messages.length === 0) {
        dom.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <h2>${dom.currentRoomName.textContent}</h2>
                <p>Henüz mesaj yok. İlk mesajı sen gönder!</p>
            </div>
        `;
        return;
    }
    
    state.messages.forEach(message => {
        const messageElement = createMessageElement(message);
        dom.messagesContainer.appendChild(messageElement);
    });
    
    // Scroll to bottom
    scrollToBottom();
}

// Create message element
function createMessageElement(message) {
    const isCurrentUser = message.userId === state.currentUser.id;
    const messageType = message.type === 'system' ? 'system' : isCurrentUser ? 'sent' : 'received';
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${messageType}`;
    messageElement.dataset.messageId = message.id;
    
    const time = new Date(message.timestamp);
    const timeString = time.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let content = escapeHtml(message.message);
    
    // Format message based on type
    if (message.type === 'image') {
        content = `<img src="${message.metadata?.url || ''}" alt="${escapeHtml(message.metadata?.filename || 'Resim')}" style="max-width: 300px; border-radius: 8px; margin-top: 0.5rem;">`;
    } else if (message.type === 'file') {
        content = `
            <div class="file-message">
                <i class="fas fa-file" style="margin-right: 0.5rem;"></i>
                <a href="${message.metadata?.url || '#'}" download="${escapeHtml(message.metadata?.filename || 'dosya')}" style="color: ${messageType === 'sent' ? 'white' : 'var(--primary-color)'};">
                    ${escapeHtml(message.metadata?.filename || 'Dosya')}
                </a>
                <span style="font-size: 0.8rem; opacity: 0.8; margin-left: 0.5rem;">
                    (${formatFileSize(message.metadata?.fileSize || 0)})
                </span>
            </div>
        `;
    }
    
    // Check if markdown is enabled
    const markdownEnabled = document.getElementById('markdown-toggle')?.checked;
    if (markdownEnabled && message.type === 'text') {
        content = marked.parse(content);
    }
    
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-username">${escapeHtml(message.username)}</span>
            <span class="message-time">${timeString}</span>
        </div>
        <div class="message-content">${content}</div>
        ${message.reactions && Object.keys(message.reactions).length > 0 ? createReactionsHTML(message.reactions) : ''}
    `;
    
    // Add click event for reactions
    if (message.reactions) {
        const reactionContainer = messageElement.querySelector('.message-reactions');
        if (reactionContainer) {
            Object.entries(message.reactions).forEach(([emoji, users]) => {
                const reactionBtn = reactionContainer.querySelector(`[data-emoji="${emoji}"]`);
                if (reactionBtn) {
                    reactionBtn.addEventListener('click', () => reactToMessage(message.id, emoji));
                }
            });
        }
    }
    
    return messageElement;
}

// Create reactions HTML
function createReactionsHTML(reactions) {
    let html = '<div class="message-reactions">';
    
    Object.entries(reactions).forEach(([emoji, users]) => {
        const count = users.length;
        const hasReacted = users.includes(state.currentUser.id);
        
        html += `
            <div class="reaction ${hasReacted ? 'active' : ''}" data-emoji="${emoji}">
                <span>${emoji}</span>
                <span>${count}</span>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// Load online users
async function loadOnlineUsers() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/rooms/${state.currentRoom}/users`);
        const data = await response.json();
        
        state.onlineUsers = data.users;
        renderOnlineUsers();
        
        // Update online count
        dom.onlineCount.textContent = data.total;
        
    } catch (error) {
        console.error('Çevrimiçi kullanıcılar yüklenemedi:', error);
    }
}

// Render online users
function renderOnlineUsers() {
    dom.onlineUsersList.innerHTML = '';
    
    state.onlineUsers.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        
        userElement.innerHTML = `
            <div class="user-avatar" style="background-color: ${stringToColor(user.username)};">
                ${user.username.charAt(0).toUpperCase()}
            </div>
            <div class="user-name">${escapeHtml(user.username)}</div>
            <div class="status ${user.isOnline ? 'online' : 'offline'}"></div>
        `;
        
        userElement.addEventListener('click', () => showUserProfile(user.id));
        dom.onlineUsersList.appendChild(userElement);
    });
}

// Load room members
async function loadRoomMembers() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/rooms/${state.currentRoom}/users`);
        const data = await response.json();
        
        renderRoomMembers(data.users);
        
    } catch (error) {
        console.error('Oda üyeleri yüklenemedi:', error);
    }
}

// Render room members
function renderRoomMembers(members) {
    dom.roomMembersList.innerHTML = '';
    
    members.forEach(user => {
        const memberElement = document.createElement('div');
        memberElement.className = 'member-item';
        
        memberElement.innerHTML = `
            <div class="user-avatar" style="background-color: ${stringToColor(user.username)};">
                ${user.username.charAt(0).toUpperCase()}
            </div>
            <div class="user-name">${escapeHtml(user.username)}</div>
            <div class="status ${user.isOnline ? 'online' : 'offline'}"></div>
        `;
        
        memberElement.addEventListener('click', () => showUserProfile(user.id));
        dom.roomMembersList.appendChild(memberElement);
    });
    
    // Update member count
    dom.roomMemberCount.textContent = members.length;
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch(CONFIG.API_URL + '/statistics');
        const stats = await response.json();
        
        // Update UI
        dom.totalMessages.textContent = stats.totalMessages.toLocaleString();
        dom.totalUsers.textContent = stats.totalUsers.toLocaleString();
        dom.totalRooms.textContent = stats.roomsCount.toLocaleString();
        
    } catch (error) {
        console.error('İstatistikler yüklenemedi:', error);
    }
}

// Handle message input
function handleMessageInput() {
    updateCharCounter();
    
    // Typing indicator
    if (!state.isTyping) {
        state.isTyping = true;
        // sendTypingIndicator();
    }
    
    state.lastTypingTime = Date.now();
}

// Update character counter
function updateCharCounter() {
    const length = dom.messageInput.value.length;
    dom.charCount.textContent = `${length}/2000`;
    
    if (length > 1800) {
        dom.charCount.style.color = 'var(--danger-color)';
    } else if (length > 1500) {
        dom.charCount.style.color = 'var(--warning-color)';
    } else {
        dom.charCount.style.color = 'var(--text-secondary)';
    }
}

// Handle message keydown
function handleMessageKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
    
    // Typing timeout
    clearTimeout(state.typingTimeout);
    state.typingTimeout = setTimeout(() => {
        if (Date.now() - state.lastTypingTime > CONFIG.TYPING_TIMEOUT) {
            state.isTyping = false;
            // sendStopTyping();
        }
    }, CONFIG.TYPING_TIMEOUT);
}

// Send message
async function sendMessage() {
    const message = dom.messageInput.value.trim();
    
    if (!message) return;
    
    // Check connection
    if (!state.isConnected) {
        showNotification('İnternet bağlantınız yok', 'error');
        return;
    }
    
    try {
        const response = await fetch(CONFIG.API_URL + '/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roomId: state.currentRoom,
                userId: state.currentUser.id,
                username: state.currentUser.username,
                message: message,
                type: 'text'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear input
            dom.messageInput.value = '';
            updateCharCounter();
            
            // Add message to UI
            const messageElement = createMessageElement(data.message);
            dom.messagesContainer.appendChild(messageElement);
            
            // Scroll to bottom
            scrollToBottom();
            
            // Play sound if enabled
            if (document.getElementById('sound-toggle')?.checked) {
                playMessageSound();
            }
            
        } else {
            showNotification(data.error || 'Mesaj gönderilemedi', 'error');
        }
        
    } catch (error) {
        console.error('Mesaj gönderme hatası:', error);
        showNotification('Mesaj gönderilemedi', 'error');
        
        // Add to queue for retry
        state.messageQueue.push({
            roomId: state.currentRoom,
            userId: state.currentUser.id,
            username: state.currentUser.username,
            message: message,
            type: 'text'
        });
    }
}

// React to message
async function reactToMessage(messageId, reaction) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/messages/${messageId}/react`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: state.currentUser.id,
                reaction: reaction
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update message reactions in UI
            updateMessageReactions(messageId, data.reactions);
        }
        
    } catch (error) {
        console.error('Reaksiyon hatası:', error);
    }
}

// Update message reactions
function updateMessageReactions(messageId, reactions) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) return;
    
    const reactionsContainer = messageElement.querySelector('.message-reactions');
    if (reactionsContainer) {
        reactionsContainer.innerHTML = createReactionsHTML(reactions);
    } else {
        messageElement.innerHTML += createReactionsHTML(reactions);
    }
}

// Create room
async function createRoom() {
    const name = dom.roomNameInput.value.trim();
    const description = dom.roomDescriptionInput.value.trim();
    const isPrivate = document.getElementById('room-private').checked;
    
    if (!name) {
        showNotification('Oda adı gerekli', 'error');
        dom.roomNameInput.focus();
        return;
    }
    
    try {
        const response = await fetch(CONFIG.API_URL + '/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                description: description,
                userId: state.currentUser.id,
                isPrivate: isPrivate
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Close modal
            document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
            
            // Clear inputs
            dom.roomNameInput.value = '';
            dom.roomDescriptionInput.value = '';
            
            // Reload rooms
            await loadRooms();
            
            // Switch to new room
            await switchRoom(data.room.id);
            
            // Show notification
            showNotification(`"${name}" odası oluşturuldu`, 'success');
            
        } else {
            showNotification(data.error || 'Oda oluşturulamadı', 'error');
        }
        
    } catch (error) {
        console.error('Oda oluşturma hatası:', error);
        showNotification('Oda oluşturulamadı', 'error');
    }
}

// Handle file upload
function handleFileUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.doc,.docx,.txt,.zip';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Check file size
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            showNotification(`Dosya çok büyük (Max: ${CONFIG.MAX_FILE_SIZE / (1024*1024)}MB)`, 'error');
            return;
        }
        
        // Show loading
        showNotification('Dosya yükleniyor...', 'info');
        
        try {
            // Convert file to base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = async () => {
                const base64 = reader.result.split(',')[1];
                
                const response = await fetch(CONFIG.API_URL + '/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        file: base64,
                        filename: file.name,
                        fileType: file.type,
                        userId: state.currentUser.id,
                        roomId: state.currentRoom
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showNotification('Dosya yüklendi', 'success');
                    
                    // Add message to UI
                    const messageElement = createMessageElement(data.message);
                    dom.messagesContainer.appendChild(messageElement);
                    
                    // Scroll to bottom
                    scrollToBottom();
                    
                    // Play sound
                    if (document.getElementById('sound-toggle')?.checked) {
                        playMessageSound();
                    }
                    
                } else {
                    showNotification(data.error || 'Dosya yüklenemedi', 'error');
                }
            };
            
        } catch (error) {
            console.error('Dosya yükleme hatası:', error);
            showNotification('Dosya yüklenemedi', 'error');
        }
    };
    
    input.click();
}

// Toggle emoji picker
function toggleEmojiPicker() {
    dom.emojiPicker.classList.toggle('active');
}

// Insert emoji
function insertEmoji(emoji) {
    const input = dom.messageInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    
    input.value = input.value.substring(0, start) + emoji + input.value.substring(end);
    input.focus();
    input.setSelectionRange(start + emoji.length, start + emoji.length);
    
    updateCharCounter();
}

// Apply formatting
function applyFormatting(format) {
    const input = dom.messageInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = input.value.substring(start, end);
    
    let formattedText = '';
    
    switch (format) {
        case 'bold':
            formattedText = `**${selectedText}**`;
            break;
        case 'italic':
            formattedText = `*${selectedText}*`;
            break;
        case 'code':
            formattedText = `\`${selectedText}\``;
            break;
        case 'link':
            const url = prompt('Link URL\'si:', 'https://');
            if (url) {
                formattedText = `[${selectedText || 'link'}](${url})`;
            } else {
                return;
            }
            break;
    }
    
    input.value = input.value.substring(0, start) + formattedText + input.value.substring(end);
    input.focus();
    input.setSelectionRange(start + formattedText.length, start + formattedText.length);
    
    updateCharCounter();
}

// Scroll to bottom
function scrollToBottom() {
    dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;
}

// Start periodic updates
function startPeriodicUpdates() {
    setInterval(async () => {
        if (state.isConnected) {
            await Promise.all([
                loadMessages(),
                loadOnlineUsers(),
                loadStatistics()
            ]);
        }
    }, CONFIG.UPDATE_INTERVAL);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    notification.innerHTML = `
        <div class="notification-icon">${icons[type] || 'ℹ'}</div>
        <div class="notification-content">
            <div class="notification-title">${type === 'success' ? 'Başarılı' : type === 'error' ? 'Hata' : type === 'warning' ? 'Uyarı' : 'Bilgi'}</div>
            <div class="notification-message">${escapeHtml(message)}</div>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
    
    dom.notificationContainer.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Show modal
function showModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}

// Show user profile
function showUserProfile(userId) {
    // TODO: Implement user profile modal
    showNotification('Kullanıcı profili özelliği yakında eklenecek', 'info');
}

// Update server status
function updateServerStatus(status) {
    const indicator = dom.serverStatus;
    
    switch (status) {
        case 'online':
            indicator.style.backgroundColor = 'var(--success-color)';
            indicator.title = 'Sunucu çalışıyor';
            state.isConnected = true;
            break;
        case 'offline':
            indicator.style.backgroundColor = 'var(--danger-color)';
            indicator.title = 'Sunucu bağlantısı yok';
            state.isConnected = false;
            break;
        case 'connecting':
            indicator.style.backgroundColor = 'var(--warning-color)';
            indicator.title = 'Bağlanıyor...';
            break;
    }
}

// Handle before unload
function handleBeforeUnload() {
    // Send offline status
    // sendUserStatus('offline');
}

// Handle connection change
function handleConnectionChange() {
    if (navigator.onLine) {
        state.isConnected = true;
        updateServerStatus('online');
        showNotification('İnternet bağlantısı yeniden sağlandı', 'success');
        
        // Retry queued messages
        retryQueuedMessages();
        
    } else {
        state.isConnected = false;
        updateServerStatus('offline');
        showNotification('İnternet bağlantısı kesildi', 'error');
    }
}

// Retry queued messages
async function retryQueuedMessages() {
    for (const message of state.messageQueue) {
        try {
            await fetch(CONFIG.API_URL + '/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message)
            });
            
            // Remove from queue if successful
            state.messageQueue = state.messageQueue.filter(m => m !== message);
            
        } catch (error) {
            console.error('Kuyruktaki mesaj gönderilemedi:', error);
        }
    }
}

// Play message sound
function playMessageSound() {
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// String to color
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
        '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
    ];
    
    return colors[Math.abs(hash) % colors.length];
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);