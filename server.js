const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (public klasöründekileri sun)
app.use(express.static(path.join(__dirname, 'public')));

// Memory Database (Vercel'de dosya yazma yok)
let messages = [
  {
    id: 1,
    username: "Sistem",
    message: "Chat uygulamasına hoş geldiniz!",
    timestamp: new Date().toISOString(),
    type: "system"
  }
];

// 1. Ana sayfa - index.html'i gönder
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. API Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API çalışıyor',
    timestamp: new Date().toISOString(),
    messageCount: messages.length
  });
});

// 3. Tüm mesajları getir
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

// 4. Yeni mesaj ekle
app.post('/api/messages', (req, res) => {
  try {
    const { username, message } = req.body;
    
    // Validation
    if (!username || !message) {
      return res.status(400).json({
        success: false,
        error: 'Kullanıcı adı ve mesaj gerekli'
      });
    }
    
    const newMessage = {
      id: Date.now(),
      username: username.trim(),
      message: message.trim(),
      timestamp: new Date().toISOString(),
      type: 'user'
    };
    
    messages.push(newMessage);
    
    // Son 200 mesajı tut
    if (messages.length > 200) {
      messages = messages.slice(-200);
    }
    
    res.json({
      success: true,
      message: newMessage
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
});

// 5. Tüm mesajları temizle
app.delete('/api/messages', (req, res) => {
  try {
    // Sistem mesajını koru
    const systemMessage = messages.find(m => m.type === 'system');
    messages = systemMessage ? [systemMessage] : [];
    
    res.json({
      success: true,
      message: 'Tüm mesajlar temizlendi'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Temizleme hatası'
    });
  }
});

// 6. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 7. Vercel info
app.get('/api/vercel', (req, res) => {
  res.json({
    platform: 'Vercel',
    nodeVersion: process.version,
    uptime: process.uptime()
  });
});

// 8. 404 handler - Olmayan route'lar için
app.use((req, res) => {
  res.status(404).json({
    error: 'Route bulunamadı',
    path: req.path
  });
});

// 9. Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Server başlat
app.listen(PORT, () => {
  console.log(`✅ Server ${PORT} portunda çalışıyor`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/test`);
});

module.exports = app;