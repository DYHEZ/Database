// API URL
const API_URL = window.location.origin + '/api';

// DOM Elements
const chatArea = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const usernameInput = document.getElementById('username-input');
const sendBtn = document.getElementById('send-btn');
const apiStatus = document.getElementById('api-status');

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
  checkAPI();
  loadMessages();
  
  // Kullanıcı adını localStorage'dan yükle
  const savedUser = localStorage.getItem('chat_username');
  if (savedUser) {
    usernameInput.value = savedUser;
  }
  
  // Enter tuşu ile mesaj gönder
  messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Kullanıcı adı değişikliğini kaydet
  usernameInput.addEventListener('change', function() {
    localStorage.setItem('chat_username', usernameInput.value.trim());
  });
});

// API kontrolü
async function checkAPI() {
  try {
    apiStatus.textContent = 'Kontrol ediliyor...';
    apiStatus.style.color = 'orange';
    
    const response = await fetch(API_URL + '/test');
    const data = await response.json();
    
    apiStatus.textContent = 'Çalışıyor ✓';
    apiStatus.style.color = 'green';
    
    console.log('✅ API bağlantısı başarılı:', data);
    
  } catch (error) {
    console.error('❌ API hatası:', error);
    apiStatus.textContent = 'Bağlantı hatası ✗';
    apiStatus.style.color = 'red';
  }
}

// Mesajları yükle
async function loadMessages() {
  try {
    const response = await fetch(API_URL + '/messages');
    const messages = await response.json();
    
    chatArea.innerHTML = '';
    
    messages.forEach(msg => {
      addMessageToUI(msg);
    });
    
    // Scroll'u en alta al
    chatArea.scrollTop = chatArea.scrollHeight;
    
  } catch (error) {
    console.error('Mesaj yükleme hatası:', error);
    showError('Mesajlar yüklenemedi');
  }
}

// Mesaj gönder
async function sendMessage() {
  const username = usernameInput.value.trim();
  const message = messageInput.value.trim();
  
  if (!username) {
    showError('Kullanıcı adı gerekli');
    usernameInput.focus();
    return;
  }
  
  if (!message) {
    showError('Mesaj boş olamaz');
    messageInput.focus();
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
      messageInput.value = '';
      
      // Scroll'u güncelle
      chatArea.scrollTop = chatArea.scrollHeight;
      
      // Başarı mesajı
      showSuccess('Mesaj gönderildi!');
      
    } else {
      showError(data.error || 'Mesaj gönderilemedi');
    }
    
  } catch (error) {
    console.error('Gönderme hatası:', error);
    showError('Mesaj gönderilemedi');
  }
}

// Mesajı UI'a ekle
function addMessageToUI(msg) {
  const messageDiv = document.createElement('div');
  
  let messageClass = 'message ';
  if (msg.type === 'system') {
    messageClass += 'system';
  } else if (msg.username === usernameInput.value.trim()) {
    messageClass += 'sent';
  } else {
    messageClass += 'received';
  }
  
  const time = new Date(msg.timestamp);
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

// Bildirim fonksiyonları
function showError(message) {
  alert('Hata: ' + message);
}

function showSuccess(message) {
  // Basit bir bildirim
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 1000;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// HTML escape
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Global fonksiyonlar (butonlar için)
window.sendMessage = sendMessage;
window.loadMessages = loadMessages;

// Temizleme fonksiyonu
window.clearMessages = async function() {
  if (!confirm('Tüm mesajları silmek istediğinize emin misiniz?')) return;
  
  try {
    const response = await fetch(API_URL + '/messages', {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Mesajları yeniden yükle (sistem mesajı görünecek)
      loadMessages();
      showSuccess('Mesajlar temizlendi');
    }
    
  } catch (error) {
    showError('Temizleme başarısız');
  }
};