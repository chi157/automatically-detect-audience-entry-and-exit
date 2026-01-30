const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// 儲存所有連線的用戶
const users = new Map();
const clients = new Set();

wss.on('connection', (ws) => {
 
  clients.add(ws);
  console.log(`新的連線建立，目前連線數：${clients.size}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'join') {
        // 用戶加入
        const userId = data.userId || `User_${Date.now()}`;
        const username = data.username || `訪客${users.size + 1}`;
        
        users.set(userId, {
          id: userId,
          username: username,
          joinTime: new Date().toISOString(),
          ws: ws
        });

        // 廣播用戶加入訊息
        broadcast({
          type: 'user_joined',
          userId: userId,
          username: username,
          timestamp: new Date().toISOString(),
          currentUsers: Array.from(users.values()).map(u => ({
            id: u.id,
            username: u.username,
            joinTime: u.joinTime
          }))
        });

        console.log(`用戶加入: ${username} (ID: ${userId})`);
      } else if (data.type === 'leave') {
        // 用戶離開
        const userId = data.userId;
        const user = users.get(userId);
        
        if (user) {
          users.delete(userId);
          
          broadcast({
            type: 'user_left',
            userId: userId,
            username: user.username,
            timestamp: new Date().toISOString(),
            currentUsers: Array.from(users.values()).map(u => ({
              id: u.id,
              username: u.username,
              joinTime: u.joinTime
            }))
          });

          console.log(`用戶離開: ${user.username} (ID: ${userId})`);
        }
      } else if (data.type === 'get_users') {
        // 獲取當前用戶列表
        ws.send(JSON.stringify({
          type: 'users_list',
          users: Array.from(users.values()).map(u => ({
            id: u.id,
            username: u.username,
            joinTime: u.joinTime
          }))
        }));
      }
    } catch (error) {
      console.error('處理訊息時發生錯誤:', error);
    }
  });

  ws.on('close', () => {
    console.log(`連線關閉，目前連線數：${clients.size - 1}`);
    clients.delete(ws);
    
    // 尋找並移除斷線的用戶
    for (const [userId, user] of users.entries()) {
      if (user.ws === ws) {
        users.delete(userId);
        
        broadcast({
          type: 'user_left',
          userId: userId,
          username: user.username,
          timestamp: new Date().toISOString(),
          currentUsers: Array.from(users.values()).map(u => ({
            id: u.id,
            username: u.username,
            joinTime: u.joinTime
          }))
        });

        console.log(`用戶斷線: ${user.username} (ID: ${userId})`);
        break;
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket 錯誤:', error);
  });

  ws.onclose = () => {
    // ...
    reconnectInterval = setInterval(() => {
      connect();
    }, 5000);
  };
});

function broadcast(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`伺服器啟動成功！`);
  console.log(`WebSocket 伺服器運行於: ws://localhost:${PORT}`);
  console.log(`OBS 頁面: http://localhost:${PORT}/obs.html`);
  console.log(`後台管理: http://localhost:${PORT}/admin.html`);
  console.log(`=================================`);
});

// 提供靜態檔案服務
server.on('request', (req, res) => {
  const fs = require('fs');
  const path = require('path');

  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './admin.html';
  }

  // 如果請求 /xxx 則優先從 public 目錄找檔案
  const publicPath = path.join(__dirname, 'public', req.url.replace(/^\//, ''));
  if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
    const extname = String(path.extname(publicPath)).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.gif': 'image/gif',
      '.mp3': 'audio/mpeg',
    };
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    fs.readFile(publicPath, (error, content) => {
      if (error) {
        res.writeHead(500);
        res.end('伺服器錯誤: ' + error.code, 'utf-8');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
    return;
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.mp3': 'audio/mpeg',
  };
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - 找不到頁面</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('伺服器錯誤: ' + error.code, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});
