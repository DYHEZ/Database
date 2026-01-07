// API URL'si
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// DOM Elements
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const usernameInput = document.getElementById('username-input');
const sendBtn = document.getElementById('send-btn');
const refreshBtn = document.getElementById('refresh-btn');
const clearBtn = document.getElementById('clear-btn');
const charCounter = document.getElementById('char-counter');
const apiStatus = document.getElementById('api-status');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notification-text');

// Karakter sayacı
messageInput.addEventListener('input', () => {
    const length = messageInput.value.length;
    charCounter.textContent = `${length}/500`;
    
    if (length > 450) {
        charCounter.style.color = '#ef4444';
    } else if (length > 400) {
        charCounter.style.color = '#f59e0b';
    } else {
        charCounter.style.color = '#64748b';
    }
});

// Mesaj gönder
async function sendMessage() {
    const message = messageInput.value.trim();
    const username = usernameInput.value.trim();
    
    if (!message) {
        showNotification('Mesaj boş olamaz!', 'error');
        return;
    }
    
    if (!username) {
        showNotification('Kullanıcı adı gerekli!', 'error');
        usernameInput.focus();
        return;
    }
    
    try {
        updateApiStatus('Gönderiliyor...', 'loading');
        
        const response = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                message: message
            })
        });
        
        if (!response.ok) {
            throw new Error('Mesaj gönderilemedi');
        }
        
        const data = await response.json();
        
        // Mesajı ekrana ekle
        addMessageToUI(data.message, 'sent');
        
        // Input'u temizle
        messageInput.value = '';
        charCounter.textContent = '0/500';
        charCounter.style.color = '#64748b';
        
        showNotification('Mesaj gönderildi!', 'success');
        updateApiStatus('Başarılı', 'success');
        
        // Otomatik olarak mesajları yenile
        setTimeout(() => {
            updateApiStatus('Hazır', 'ready');
        }, 1000);
        
    } catch (error) {
        console.error('Mesaj gönderme hatası:', error);
        showNotification('Mesaj gönderilemedi!', 'error');
        updateApiStatus('Hata', 'error');
    }
}

// Mesajları yükle
async function loadMessages() {
    try {
        updateApiStatus('Yükleniyor...', 'loading');
        
        const response = await fetch(`${API_URL}/messages`);
        
        if (!response.ok) {
            throw new Error('Mesajlar yüklenemedi');
        }
        
        const messages = await response.json();
        
        // Mesajları temizle
        messagesContainer.innerHTML = '';
        
        // Mesajları ekrana ekle
        messages.forEach(message => {
            const messageType = message.type === 'system' ? 'system' : 
                              message.username === usernameInput.value.trim() ? 'sent' : 'received';
            addMessageToUI(message, messageType);
        });
        
        updateApiStatus('Hazır', 'ready');
        
    } catch (error) {
        console.error('Mesaj yükleme hatası:', error);
        showNotification('Mesajlar yüklenemedi!', 'error');
        updateApiStatus('Hata', 'error');
        
        // Fallback: LocalStorage'dan yükle
        const fallbackMessages = JSON.parse(localStorage.getItem('fallback_messages') || '[]');
        if (fallbackMessages.length > 0) {
            messagesContainer.innerHTML = '';
            fallbackMessages.forEach(message => {
                const messageType = message.type === 'system' ? 'system' : 
                                  message.username === usernameInput.value.trim() ? 'sent' : 'received';
                addMessageToUI(message, messageType);
            });
        }
    }
}

// Mesajı UI'a ekle
function addMessageToUI(message, type) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    
    const time = new Date(message.timestamp);
    const timeString = time.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-username">${escapeHtml(message.username)}</span>
            <span class="message-time">${timeString}</span>
        </div>
        <div class="message-content">${escapeHtml(message.message)}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    
    // Scroll'u en alta getir
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Fallback için localStorage'a kaydet
    if (type !== 'system') {
        const fallbackMessages = JSON.parse(localStorage.getItem('fallback_messages') || '[]');
        fallbackMessages.push(message);
        if (fallbackMessages.length > 50) {
            fallbackMessages.shift(); // Eski mesajları temizle
        }
        localStorage.setItem('fallback_messages', JSON.stringify(fallbackMessages));
    }
}

// Tüm mesajları temizle
async function clearAllMessages() {
    if (!confirm('Tüm mesajları silmek istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        updateApiStatus('Temizleniyor...', 'loading');
        
        const response = await fetch(`${API_URL}/messages`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Mesajlar temizlenemedi');
        }
        
        // UI'ı temizle
        messagesContainer.innerHTML = '';
        
        // Fallback'i temizle
        localStorage.removeItem('fallback_messages');
        
        showNotification('Tüm mesajlar temizlendi!', 'success');
        updateApiStatus('Hazır', 'ready');
        
        // Sistem mesajını göster
        const systemMessage = {
            id: Date.now(),
            username: "Sistem",
            message: "Sohbet temizlendi. Yeni mesajlar göndermeye başlayın!",
            timestamp: new Date().toISOString(),
            type: "system"
        };
        
        addMessageToUI(systemMessage, 'system');
        
    } catch (error) {
        console.error('Mesaj temizleme hatası:', error);
        showNotification('Mesajlar temizlenemedi!', 'error');
        updateApiStatus('Hata', 'error');
    }
}

// API durumunu güncelle
function updateApiStatus(text, status) {
    apiStatus.textContent = `API: ${text}`;
    
    switch(status) {
        case 'loading':
            apiStatus.style.color = '#f59e0b';
            break;
        case 'success':
            apiStatus.style.color = '#10b981';
            break;
        case 'error':
            apiStatus.style.color = '#ef4444';
            break;
        default:
            apiStatus.style.color = '#64748b';
    }
}

// Bildirim göster
function showNotification(text, type = 'info') {
    notificationText.textContent = text;
    
    // Tip'e göre renk
    switch(type) {
        case 'success':
            notification.style.background = '#10b981';
            break;
        case 'error':
            notification.style.background = '#ef4444';
            break;
        case 'warning':
            notification.style.background = '#f59e0b';
            break;
        default:
            notification.style.background = '#4f46e5';
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// HTML escape
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

refreshBtn.addEventListener('click', loadMessages);

clearBtn.addEventListener('click', clearAllMessages);

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    // Varsayılan kullanıcı adını yükle
    const savedUsername = localStorage.getItem('chat_username');
    if (savedUsername) {
        usernameInput.value = savedUsername;
    }
    
    // Kullanıcı adı değiştiğinde kaydet
    usernameInput.addEventListener('change', () => {
        if (usernameInput.value.trim()) {
            localStorage.setItem('chat_username', usernameInput.value.trim());
        }
    });
    
    // Mesajları yükle
    loadMessages();
    
    // Auto-refresh her 30 saniyede bir
    setInterval(loadMessages, 30000);
});