// Twitch IRC 監聽聊天室 join 事件，並透過 WebSocket 廣播給前端
const tmi = require('tmi.js');
const fs = require('fs');
const path = require('path');

// 讀取 Twitch 設定
const configPath = path.join(__dirname, 'twitch-config.json');
let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (e) {
  config = JSON.parse(fs.readFileSync(path.join(__dirname, 'twitch-config.example.json'), 'utf-8'));
}

// 建立 tmi.js 客戶端
const client = new tmi.Client({
  options: { debug: true },
  identity: {
    username: config.username,
    password: config.oauth
  },
  channels: config.channels
});

// WebSocket 廣播
const WebSocket = require('ws');
const wsPort = 3301;
const wss = new WebSocket.Server({ port: wsPort });

function broadcast(message) {
  const msg = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// 監聽聊天室 join 事件
client.on('join', (channel, username, self) => {
  if (!self) {
    broadcast({
      type: 'twitch_user_join',
      username
    });
    console.log(`[Twitch] ${username} 加入 ${channel}`);
  }
});

// 監聽聊天室發言事件
client.on('message', (channel, tags, message, self) => {
  if (!self) {
    const displayName = tags['display-name'] || tags.username;
    // broadcast({
    //   type: 'twitch_user_join',
    //   username: displayName
    // });
    console.log(`[Twitch] ${displayName} 發言於 ${channel}`);
  }
});

client.connect().catch(console.error);

console.log(`Twitch bot 啟動，監聽 ${config.channels.join(', ')}，WebSocket 廣播於 ws://localhost:${wsPort}`);