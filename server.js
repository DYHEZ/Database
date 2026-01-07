const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database yolu
const DB_PATH = path.join(__dirname, 'database', 'database.json');

// Database'i başlat (yoksa oluştur)
async function initializeDatabase() {
    try {
        await fs.access(DB_PATH);
        console.log('Database dosyası mevcut.');
    } catch {
        console.log('Database dosyası oluşturuluyor...');
        const initialData = {
            messages: [
                {
                    id: 1,
                    username: "Sistem",
                    message: "Chat uygulamasına hoş geldiniz!",
                    timestamp: new Date().toISOString(),
                    type: "system"
                },
                {
                    id: 2,
                    username: "ChatBot",
                    message: "Mesaj göndermek için aşağıdaki kutuya yazın!",
                    timestamp: new Date().toISOString(),
                    type: "user"
                }
            ],
            users: [],
            settings: {
                maxMessages: 1000,
                autoCleanup: true
            }
        };
        
        await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
        await fs.writeFile(DB_PATH, JSON.stringify(initialData, null, 2));
    }
}

// Tüm mesajları getir
app.get('/api/messages', async (req, res) => {
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        const db = JSON.parse(data);
        res.json(db.messages);
    } catch (error) {
        console.error('Mesajlar okunamadı:', error);
        res.status(500).json({ error: 'Mesajlar yüklenemedi' });
    }
});

// Yeni mesaj ekle
app.post('/api/messages', async (req, res) => {
    try {
        const { username, message } = req.body;
        
        if (!username || !message) {
            return res.status(400).json({ error: 'Kullanıcı adı ve mesaj gereklidir' });
        }
        
        const data = await fs.readFile(DB_PATH, 'utf8');
        const db = JSON.parse(data);
        
        const newMessage = {
            id: Date.now(),
            username: username.trim(),
            message: message.trim(),
            timestamp: new Date().toISOString(),
            type: 'user'
        };
        
        db.messages.push(newMessage);
        
        // Mesaj sayısı sınırlaması (eski mesajları temizle)
        if (db.messages.length > db.settings.maxMessages) {
            db.messages = db.messages.slice(-db.settings.maxMessages);
        }
        
        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
        
        res.json({ 
            success: true, 
            message: newMessage 
        });
        
    } catch (error) {
        console.error('Mesaj eklenemedi:', error);
        res.status(500).json({ error: 'Mesaj eklenemedi' });
    }
});

// Mesaj sil
app.delete('/api/messages/:id', async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        
        const data = await fs.readFile(DB_PATH, 'utf8');
        const db = JSON.parse(data);
        
        const initialLength = db.messages.length;
        db.messages = db.messages.filter(msg => msg.id !== messageId);
        
        if (db.messages.length === initialLength) {
            return res.status(404).json({ error: 'Mesaj bulunamadı' });
        }
        
        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
        
        res.json({ 
            success: true, 
            message: 'Mesaj silindi' 
        });
        
    } catch (error) {
        console.error('Mesaj silinemedi:', error);
        res.status(500).json({ error: 'Mesaj silinemedi' });
    }
});

// Tüm mesajları temizle
app.delete('/api/messages', async (req, res) => {
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        const db = JSON.parse(data);
        
        // Sistem mesajını koru
        const systemMessage = db.messages.find(msg => msg.type === 'system');
        db.messages = systemMessage ? [systemMessage] : [];
        
        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
        
        res.json({ 
            success: true, 
            message: 'Tüm mesajlar temizlendi' 
        });
        
    } catch (error) {
        console.error('Mesajlar temizlenemedi:', error);
        res.status(500).json({ error: 'Mesajlar temizlenemedi' });
    }
});

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sunucuyu başlat
async function startServer() {
    await initializeDatabase();
    
    app.listen(PORT, () => {
        console.log(`Server çalışıyor: http://localhost:${PORT}`);
        console.log(`API Endpoints:`);
        console.log(`  GET  /api/messages`);
        console.log(`  POST /api/messages`);
        console.log(`  DELETE /api/messages/:id`);
        console.log(`  DELETE /api/messages (tümünü temizle)`);
    });
}

startServer();