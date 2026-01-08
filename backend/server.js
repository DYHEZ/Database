const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Database path
const DB_PATH = path.join(__dirname, 'database', 'database.json');

// Initialize database
async function initDatabase() {
  try {
    await fs.access(DB_PATH);
    console.log('✅ Database mevcut');
  } catch {
    console.log('🔄 Database oluşturuluyor...');
    const initialData = {
      messages: [],
      users: {},
      rooms: {
        'genel': {
          id: 'genel',
          name: 'Genel Sohbet',
          description: 'Herkesin katılabileceği genel sohbet odası',
          created: new Date().toISOString(),
          members: []
        },
        'teknoloji': {
          id: 'teknoloji',
          name: 'Teknoloji',
          description: 'Teknoloji haberleri ve tartışmaları',
          created: new Date().toISOString(),
          members: []
        },
        'oyun': {
          id: 'oyun',
          name: 'Oyun',
          description: 'Oyun sohbetleri',
          created: new Date().toISOString(),
          members: []
        }
      },
      settings: {
        maxMessageLength: 2000,
        maxMessagesPerRoom: 1000,
        messageLifetime: 30, // days
        allowMedia: true,
        maxFileSize: 5 * 1024 * 1024 // 5MB
      },
      statistics: {
        totalMessages: 0,
        totalUsers: 0,
        roomsCount: 3
      }
    };
    
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(initialData, null, 2));
    console.log('✅ Database oluşturuldu');
  }
}

// Read database
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Database okuma hatası:', error);
    throw error;
  }
}

// Write database
async function writeDB(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Database yazma hatası:', error);
    throw error;
  }
}

// ========== API ROUTES ==========

// 1. Health check
app.get('/api/health', async (req, res) => {
  try {
    const db = await readDB();
    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      statistics: db.statistics,
      memory: process.memoryUsage(),
      nodeVersion: process.version
    });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. Get all rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const db = await readDB();
    const rooms = Object.values(db.rooms).map(room => ({
      ...room,
      messageCount: db.messages.filter(m => m.roomId === room.id).length,
      onlineMembers: room.members.length
    }));
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Get room messages
app.get('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    const db = await readDB();
    const room = db.rooms[roomId];
    
    if (!room) {
      return res.status(404).json({ error: 'Oda bulunamadı' });
    }
    
    const roomMessages = db.messages
      .filter(m => m.roomId === roomId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      room,
      messages: roomMessages.reverse(), // En eskiden yeniye
      total: db.messages.filter(m => m.roomId === roomId).length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. Send message
app.post('/api/messages', async (req, res) => {
  try {
    const { roomId, userId, username, message, type = 'text', metadata = {} } = req.body;
    
    if (!roomId || !userId || !username || !message) {
      return res.status(400).json({ error: 'Eksik bilgi' });
    }
    
    const db = await readDB();
    
    // Check room exists
    if (!db.rooms[roomId]) {
      return res.status(404).json({ error: 'Oda bulunamadı' });
    }
    
    // Check message length
    if (message.length > db.settings.maxMessageLength) {
      return res.status(400).json({ 
        error: `Mesaj çok uzun (Max: ${db.settings.maxMessageLength} karakter)` 
      });
    }
    
    // Create message
    const newMessage = {
      id: uuidv4(),
      roomId,
      userId,
      username,
      message,
      type, // text, image, file, system
      timestamp: new Date().toISOString(),
      metadata,
      reactions: {}
    };
    
    // Add to database
    db.messages.push(newMessage);
    db.statistics.totalMessages++;
    
    // Clean old messages if exceeding limit
    const roomMessages = db.messages.filter(m => m.roomId === roomId);
    if (roomMessages.length > db.settings.maxMessagesPerRoom) {
      const messagesToRemove = roomMessages.length - db.settings.maxMessagesPerRoom;
      db.messages = db.messages.filter(m => 
        m.roomId !== roomId || 
        new Date(m.timestamp) > new Date(Date.now() - messagesToRemove * 60000)
      );
    }
    
    // Update user activity
    if (!db.users[userId]) {
      db.users[userId] = {
        id: userId,
        username,
        joined: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        messageCount: 1,
        rooms: [roomId]
      };
      db.statistics.totalUsers++;
    } else {
      db.users[userId].lastSeen = new Date().toISOString();
      db.users[userId].messageCount = (db.users[userId].messageCount || 0) + 1;
      if (!db.users[userId].rooms.includes(roomId)) {
        db.users[userId].rooms.push(roomId);
      }
    }
    
    // Update room members
    if (!db.rooms[roomId].members.includes(userId)) {
      db.rooms[roomId].members.push(userId);
    }
    
    await writeDB(db);
    
    res.json({
      success: true,
      message: newMessage,
      statistics: db.statistics
    });
    
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    res.status(500).json({ error: 'Mesaj gönderilemedi' });
  }
});

// 5. React to message
app.post('/api/messages/:messageId/react', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, reaction } = req.body;
    
    if (!messageId || !userId || !reaction) {
      return res.status(400).json({ error: 'Eksik bilgi' });
    }
    
    const db = await readDB();
    const messageIndex = db.messages.findIndex(m => m.id === messageId);
    
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Mesaj bulunamadı' });
    }
    
    // Initialize reactions object if not exists
    if (!db.messages[messageIndex].reactions) {
      db.messages[messageIndex].reactions = {};
    }
    
    // Toggle reaction
    if (db.messages[messageIndex].reactions[reaction]?.includes(userId)) {
      // Remove reaction
      db.messages[messageIndex].reactions[reaction] = 
        db.messages[messageIndex].reactions[reaction].filter(id => id !== userId);
      
      // Remove empty reaction arrays
      if (db.messages[messageIndex].reactions[reaction].length === 0) {
        delete db.messages[messageIndex].reactions[reaction];
      }
    } else {
      // Add reaction
      if (!db.messages[messageIndex].reactions[reaction]) {
        db.messages[messageIndex].reactions[reaction] = [];
      }
      db.messages[messageIndex].reactions[reaction].push(userId);
    }
    
    await writeDB(db);
    
    res.json({
      success: true,
      reactions: db.messages[messageIndex].reactions
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Reaksiyon eklenemedi' });
  }
});

// 6. Delete message
app.delete('/api/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, isAdmin = false } = req.body;
    
    const db = await readDB();
    const messageIndex = db.messages.findIndex(m => m.id === messageId);
    
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Mesaj bulunamadı' });
    }
    
    const message = db.messages[messageIndex];
    
    // Check permissions
    if (message.userId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Bu mesajı silme yetkiniz yok' });
    }
    
    // Soft delete (keep record but mark as deleted)
    db.messages[messageIndex].deleted = true;
    db.messages[messageIndex].deletedAt = new Date().toISOString();
    db.messages[messageIndex].deletedBy = userId;
    
    await writeDB(db);
    
    res.json({
      success: true,
      message: 'Mesaj silindi'
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Mesaj silinemedi' });
  }
});

// 7. Get online users in room
app.get('/api/rooms/:roomId/users', async (req, res) => {
  try {
    const { roomId } = req.params;
    const db = await readDB();
    const room = db.rooms[roomId];
    
    if (!room) {
      return res.status(404).json({ error: 'Oda bulunamadı' });
    }
    
    const onlineUsers = room.members
      .map(userId => db.users[userId])
      .filter(user => user && new Date() - new Date(user.lastSeen) < 5 * 60 * 1000) // Son 5 dakika
      .map(user => ({
        id: user.id,
        username: user.username,
        lastSeen: user.lastSeen,
        messageCount: user.messageCount,
        isOnline: new Date() - new Date(user.lastSeen) < 2 * 60 * 1000 // Son 2 dakika
      }));
    
    res.json({
      total: onlineUsers.length,
      users: onlineUsers.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 8. Create new room
app.post('/api/rooms', async (req, res) => {
  try {
    const { name, description, userId } = req.body;
    
    if (!name || !userId) {
      return res.status(400).json({ error: 'Oda adı ve kullanıcı ID gerekli' });
    }
    
    const db = await readDB();
    const roomId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    if (db.rooms[roomId]) {
      return res.status(400).json({ error: 'Bu isimde oda zaten var' });
    }
    
    const newRoom = {
      id: roomId,
      name,
      description: description || `${name} odası`,
      created: new Date().toISOString(),
      createdBy: userId,
      members: [userId],
      isPrivate: false
    };
    
    db.rooms[roomId] = newRoom;
    db.statistics.roomsCount++;
    
    // Add user to room
    if (db.users[userId]) {
      db.users[userId].rooms.push(roomId);
    }
    
    await writeDB(db);
    
    res.json({
      success: true,
      room: newRoom
    });
    
  } catch (error) {
    console.error('Oda oluşturma hatası:', error);
    res.status(500).json({ error: 'Oda oluşturulamadı' });
  }
});

// 9. Upload file (base64)
app.post('/api/upload', async (req, res) => {
  try {
    const { file, filename, fileType, userId, roomId } = req.body;
    
    if (!file || !filename || !fileType || !userId || !roomId) {
      return res.status(400).json({ error: 'Eksik bilgi' });
    }
    
    const db = await readDB();
    
    // Check file size (approximate)
    const fileSize = (file.length * 3) / 4; // Base64 approximation
    if (fileSize > db.settings.maxFileSize) {
      return res.status(400).json({ 
        error: `Dosya çok büyük (Max: ${db.settings.maxFileSize / (1024*1024)}MB)` 
      });
    }
    
    // Create file message
    const fileMessage = {
      id: uuidv4(),
      roomId,
      userId,
      username: db.users[userId]?.username || 'Kullanıcı',
      message: filename,
      type: fileType.includes('image') ? 'image' : 'file',
      timestamp: new Date().toISOString(),
      metadata: {
        filename,
        fileType,
        fileSize,
        url: `data:${fileType};base64,${file}` // Base64 data URL
      },
      reactions: {}
    };
    
    db.messages.push(fileMessage);
    db.statistics.totalMessages++;
    
    await writeDB(db);
    
    res.json({
      success: true,
      message: fileMessage
    });
    
  } catch (error) {
    console.error('Dosya yükleme hatası:', error);
    res.status(500).json({ error: 'Dosya yüklenemedi' });
  }
});

// 10. Search messages
app.get('/api/search', async (req, res) => {
  try {
    const { q, roomId, userId, limit = 50 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Arama terimi gerekli' });
    }
    
    const db = await readDB();
    
    let results = db.messages.filter(message => {
      if (roomId && message.roomId !== roomId) return false;
      if (userId && message.userId !== userId) return false;
      if (message.deleted) return false;
      
      return message.message.toLowerCase().includes(q.toLowerCase()) ||
             message.username.toLowerCase().includes(q.toLowerCase());
    });
    
    results = results
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));
    
    res.json({
      query: q,
      results,
      total: results.length
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Arama yapılamadı' });
  }
});

// 11. User profile
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = await readDB();
    
    const user = db.users[userId];
    
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    const userMessages = db.messages.filter(m => m.userId === userId && !m.deleted);
    
    res.json({
      user: {
        ...user,
        isOnline: new Date() - new Date(user.lastSeen) < 2 * 60 * 1000
      },
      statistics: {
        totalMessages: userMessages.length,
        firstMessage: userMessages[userMessages.length - 1]?.timestamp,
        lastMessage: userMessages[0]?.timestamp,
        rooms: user.rooms?.length || 0
      },
      recentMessages: userMessages.slice(0, 10)
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Kullanıcı bilgileri alınamadı' });
  }
});

// 12. Statistics
app.get('/api/statistics', async (req, res) => {
  try {
    const db = await readDB();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayMessages = db.messages.filter(m => 
      new Date(m.timestamp) >= today
    ).length;
    
    const activeRooms = Object.values(db.rooms)
      .map(room => ({
        ...room,
        activity: db.messages.filter(m => 
          m.roomId === room.id && 
          new Date() - new Date(m.timestamp) < 24 * 60 * 60 * 1000
        ).length
      }))
      .filter(room => room.activity > 0)
      .sort((a, b) => b.activity - a.activity);
    
    const topUsers = Object.values(db.users)
      .sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0))
      .slice(0, 10)
      .map(user => ({
        username: user.username,
        messageCount: user.messageCount || 0,
        lastSeen: user.lastSeen,
        isOnline: new Date() - new Date(user.lastSeen) < 2 * 60 * 1000
      }));
    
    res.json({
      ...db.statistics,
      todayMessages,
      activeRooms: activeRooms.length,
      topRooms: activeRooms.slice(0, 5),
      topUsers,
      serverUptime: process.uptime()
    });
    
  } catch (error) {
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

// 13. Cleanup old messages (cron job için)
app.post('/api/cleanup', async (req, res) => {
  try {
    const db = await readDB();
    const days = db.settings.messageLifetime || 30;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const initialCount = db.messages.length;
    db.messages = db.messages.filter(m => new Date(m.timestamp) > cutoffDate);
    const removedCount = initialCount - db.messages.length;
    
    await writeDB(db);
    
    res.json({
      success: true,
      removedCount,
      remainingCount: db.messages.length,
      cutoffDate: cutoffDate.toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Temizleme başarısız' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Initialize and start server
async function startServer() {
  await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`
🚀 PROFESYONEL CHAT UYGULAMASI BAŞLATILDI
📍 Port: ${PORT}
📊 Database: ${DB_PATH}
🔗 Local: http://localhost:${PORT}
📡 API: http://localhost:${PORT}/api/health
📁 Frontend: ${path.join(__dirname, '../frontend')}
    `);
  });
}

startServer();

module.exports = app;