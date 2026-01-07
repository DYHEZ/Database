// API URL
const API_URL = window.location.origin + '/api';

// DOM Elements
const chatArea = document.getElementById('messages-container') || document.getElementById('chat-area');
const messageInput = document.getElementById('message-input') || document.getElementById('message');
const usernameInput = document.getElementById('username-input') || document.getElementById('username');
const sendBtn = document.getElementById('send-btn');
const apiStatus = document.getElementById('api-status') || document.createElement('span');

// Server canlı tutma değişkenleri
let pingInterval;
let lastPingTime = 0;
let isOnline = true;

// ========== SAYFA YÜKLENDİĞİNDE ==========
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Chat uygulaması başlatılıyor...');
  
  // Kullanıcı adını yükle
  const savedUser = localStorage.getItem('chat_username') || 'Kullanıcı';
  if (usernameInput) usernameInput.value = savedUser;
  
  // Event listeners
  if (messageInput) {
    messageInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMessage();
    });
  }
  
  if (usernameInput) {
    usernameInput.addEventListener('change', function() {
      localStorage.setItem('chat_username', usernameInput.value.trim());
    });
  }
  
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }
  
  // Server'ı uyandır ve başlat
  wakeUpServer();
  
  // Auto-ping başlat (her 1 dakikada bir)
  startAutoPing();
  
  // Sayfa kapanırken ping'i durdur
  window.addEventListener('beforeunload', stopAutoPing);
  
  // Visibility change (tab değişince)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      wakeUpServer();
    }
  });
});

// ========== SERVER CANLI TUTMA FONKSİYONLARI ==========

// Server'ı uyandır
async function wakeUpServer() {
  try {
    console.log('🔔 Server uyandırılıyor...');
    
    // Önce ping at
    const pingResponse = await fetch(API_URL + '/ping');
    if (pingResponse.ok) {
      console.log('✅ Server zaten çalışıyor');
      updateApiStatus('Çalışıyor ✓', 'success');
      loadMessages();
      return;
    }
  } catch (error) {
    // Ping başarısız, wakeup dene
    console.log('🔄 Wakeup endpoint deneniyor...');
  }
  
  try {
    // Wakeup endpoint'i dene
    const wakeupResponse = await fetch(API_URL + '/wakeup');
    if (wakeupResponse.ok) {
      console.log('✅ Server uyandırıldı');
      updateApiStatus('Çalışıyor ✓', 'success');
      loadMessages();
    }
  } catch (error) {
    console.error('❌ Server uyandırılamadı:', error);
    updateApiStatus('Bağlantı yok ✗', 'error');
    
    // 5 saniye sonra tekrar dene
    setTimeout(wakeUpServer, 5000);
  }
}

// Auto-ping başlat
function startAutoPing() {
  // Her 1 dakikada bir ping at
  pingInterval = setInterval(async () => {
    try {
      const response = await fetch(API_URL + '/ping');
      if (response.ok) {
        lastPingTime = Date.now();
        isOnline = true;
        updateApiStatus('Çalışıyor ✓', 'success');
        
        // Her 5. ping'te mesajları yenile
        if (Math.random() < 0.2) { // %20 şans
          loadMessages();
        }
      }
    } catch (error) {
      isOnline = false;
      updateApiStatus('Bağlantı yok ✗', 'error');
      
      // Offline durumda localStorage kullan
      console.log('📴 Offline mod - localStorage kullanılıyor');
    }
  }, 60000); // 1 dakika
  
  console.log('🔄 Auto-ping başlatıldı (60 saniye)');
}

// Auto-ping durdur
function stopAutoPing() {
  if (pingInterval) {
    clearInterval(pingInterval);
    console.log('🛑 Auto-ping durduruldu');
  }
}

// API durumunu güncelle
function updateApiStatus(text, status) {
  if (!apiStatus) return;
  
  apiStatus.textContent = text;
  
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  
  apiStatus.style.color = colors[status] || '#6b7280';
  apiStatus.style.fontWeight = 'bold';
}

// ========== CHAT FONKSİYONLARI ==========

// Mesajları yükle
async function loadMessages() {
  if (!chatArea) return;
  
  try {
    const response = await fetch(API_URL + '/messages');
    
    if (!response.ok) throw new Error('API hatası');
    
    const messages = await response.json();
    
    chatArea.innerHTML = '';
    
    messages.forEach(msg => {
      addMessageToUI(msg);
    });
    
    // Scroll'u en alta al
    chatArea.scrollTop = chatArea.scrollHeight;
    
  } catch (error) {
    console.error('Mesaj yükleme hatası:', error);
    
    // Fallback: localStorage'dan yükle
    loadMessagesFromLocalStorage();
  }
}

// Mesaj gönder
async function sendMessage() {
  const username = usernameInput ? usernameInput.value.trim() : 'Kullanıcı';
  const message = messageInput ? messageInput.value.trim() : '';
  
  if (!message) {
    showNotification('Mesaj boş olamaz', 'error');
    return;
  }
  
  if (!username) {
    showNotification('Kullanıcı adı gerekli', 'error');
    return;
  }
  
  try {
    const response = await fetch(API_URL + '/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        message: message
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Mesajı ekrana ekle
      addMessageToUI(data.message);
      
      // Input'u temizle
      if (messageInput) messageInput.value = '';
      
      // Scroll'u güncelle
      if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
      
      showNotification('Mesaj gönderildi!', 'success');
      
    } else {
      showNotification(data.error || 'Gönderme başarısız', 'error');
      
      // Fallback: localStorage'a kaydet
      saveMessageToLocalStorage(username, message);
    }
    
  } catch (error) {
    console.error('Gönderme hatası:', error);
    showNotification('Sunucuya ulaşılamıyor', 'warning');
    
    // Fallback: localStorage'a kaydet
    saveMessageToLocalStorage(username, message);
  }
}

// Mesajı UI'a ekle
function addMessageToUI(msg) {
  if (!chatArea) return;
  
  const messageDiv = document.createElement('div');
  
  const username = usernameInput ? usernameInput.value.trim() : 'Kullanıcı';
  let messageClass = 'message ';
  
  if (msg.type === 'system') {
    messageClass += 'system';
  } else if (msg.username === username) {
    messageClass += 'sent';
  } else {
    messageClass += 'received';
  }
  
  const time = new Date(msg.timestamp || new Date());
  const timeString = time.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  messageDiv.className = messageClass;
  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="message-username">${escapeHtml(msg.username)}</span>
      <span class="message-time">${timeString}</span>
    </div>
    <div class="message-content">${escapeHtml(msg.message)}</div>
  `;
  
  chatArea.appendChild(messageDiv);
}

// ========== LOCALSTORAGE FALLBACK ==========

function saveMessageToLocalStorage(username, message) {
  const messages = JSON.parse(localStorage.getItem('chat_fallback') || '[]');
  
  const newMessage = {
    id: Date.now(),
    username: username,
    message: message,
    timestamp: new Date().toISOString(),
    type: 'user',
    source: 'localStorage'
  };
  
  messages.push(newMessage);
  
  // Son 100 mesajı tut
  if (messages.length > 100) {
    messages.shift();
  }
  
  localStorage.setItem('chat_fallback', JSON.stringify(messages));
  
  // UI'a ekle
  addMessageToUI(newMessage);
  
  showNotification('Mesaj lokal olarak kaydedildi (offline)', 'warning');
}

function loadMessagesFromLocalStorage() {
  if (!chatArea) return;
  
  const messages = JSON.parse(localStorage.getItem('chat_fallback') || '[]');
  
  if (messages.length > 0) {
    chatArea.innerHTML = '';
    
    messages.forEach(msg => {
      addMessageToUI(msg);
    });
    
    showNotification('Lokal mesajlar yüklendi (offline)', 'warning');
  }
}

// ========== YARDIMCI FONKSİYONLAR ==========

// Bildirim göster
function showNotification(text, type = 'info') {
  console.log(`🔔 ${type}: ${text}`);
  
  // Basit alert veya custom notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease;
  `;
  
  // CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  notification.textContent = text;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// HTML escape
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Global fonksiyonlar
window.sendMessage = sendMessage;
window.loadMessages = loadMessages;

window.clearMessages = async function() {
  if (!confirm('Tüm mesajları silmek istediğinize emin misiniz?')) return;
  
  try {
    const response = await fetch(API_URL + '/messages', {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      loadMessages();
      showNotification('Mesajlar temizlendi', 'success');
      
      // localStorage'ı da temizle
      localStorage.removeItem('chat_fallback');
    }
    
  } catch (error) {
    showNotification('Temizleme başarısız', 'error');
  }
};

window.serverStats = async function() {
  try {
    const response = await fetch(API_URL + '/stats');
    const stats = await response.json();
    
    alert(`
Server İstatistikleri:
----------------------
Başlangıç: ${new Date(stats.serverStart).toLocaleString()}
Çalışma Süresi: ${Math.floor(stats.uptime / 3600)} saat
İstek Sayısı: ${stats.requestCount}
Mesaj Sayısı: ${stats.messageCount}
Son Aktivite: ${new Date(stats.lastActivity).toLocaleTimeString()}
Node Versiyon: ${stats.nodeVersion}
    `);
    
  } catch (error) {
    console.error('Stats hatası:', error);
  }
};