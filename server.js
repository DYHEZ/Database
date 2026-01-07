const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Memory Database
let messages = [
  {
    id: 1,
    username: "Sistem",
    message: "Chat uygulaması çalışıyor! Server canlı tutuluyor.",
    timestamp: new Date().toISOString(),
    type: "system"
  }
];

// Server uptime tracking
let serverStartTime = new Date();
let requestCount = 0;
let lastActivity = new Date();

// Activity middleware - her istekte canlı tut
app.use((req, res, next) => {
  requestCount++;
  lastActivity = new Date();
  next();
});

// ========== API ROUTES ==========

// 1. Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. API Test - Canlılık kontrolü
app.get('/api/test', (req, res) => {
  const uptime = process.uptime();
  const now = new Date();
  const idleTime = (now - lastActivity) / 1000; // saniye
  
  res.json({
    status: 'OK',
    message: 'API çalışıyor',
    serverStart: serverStartTime.toISOString(),
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    requestCount: requestCount,
    lastActivity: lastActivity.toISOString(),
    idleTime: `${Math.floor(idleTime)} saniye`,
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 3. Ping endpoint - Sadece canlılık kontrolü
app.get('/api/ping', (req, res) => {
  res.json({ 
    pong: true, 
    timestamp: new Date().toISOString(),
    status: 'alive'
  });
});

// 4. Wake up endpoint - Uyandırmak için
app.get('/api/wakeup', (req, res) => {
  lastActivity = new Date();
  res.json({ 
    success: true, 
    message: 'Server uyandırıldı',
    timestamp: lastActivity.toISOString()
  });
});

// 5. Tüm mesajları getir
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

// 6. Yeni mesaj ekle
app.post('/api/messages', (req, res) => {
  try {
    const { username, message } = req.body;
    
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
    
    // Son 500 mesajı tut
    if (messages.length > 500) {
      messages = messages.slice(-500);
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

// 7. Tüm mesajları temizle
app.delete('/api/messages', (req, res) => {
  try {
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

// 8. Server stats
app.get('/api/stats', (req, res) => {
  const now = new Date();
  const uptime = process.uptime();
  const idleTime = (now - lastActivity) / 1000;
  
  res.json({
    serverStart: serverStartTime,
    uptime: uptime,
    idleTime: idleTime,
    requestCount: requestCount,
    messageCount: messages.length,
    lastActivity: lastActivity,
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route bulunamadı',
    path: req.path,
    availableEndpoints: [
      'GET  /',
      'GET  /api/test',
      'GET  /api/ping',
      'GET  /api/wakeup',
      'GET  /api/messages',
      'POST /api/messages',
      'DELETE /api/messages',
      'GET  /api/stats'
    ]
  });
});

// Error handler
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
  console.log(`📡 Test: http://localhost:${PORT}/api/test`);
  console.log(`💤 Auto-wakeup aktif`);
  
  // Auto-wakeup: Her 5 dakikada bir kendini uyandır
  setInterval(() => {
    fetch(`http://localhost:${PORT}/api/ping`).catch(() => {});
  }, 4.5 * 60 * 1000); // 4.5 dakika
});

module.exports = app;