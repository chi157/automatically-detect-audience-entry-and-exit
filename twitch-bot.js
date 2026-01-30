// ========== Twitch EventSub 追隨通知 ===========
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const eventsubPort = 8080; // 你 ngrok 會對外映射這個 port

// 請將下方 clientId、clientSecret、callbackUrl 換成你自己的
const clientId = process.env.TWITCH_CLIENT_ID || 'YOUR_CLIENT_ID';
const clientSecret = process.env.TWITCH_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const callbackUrl = process.env.TWITCH_EVENTSUB_CALLBACK || 'https://your-ngrok-url/eventsub';
const twitchUserId = process.env.TWITCH_USER_ID || 'YOUR_USER_ID'; // 你的 Twitch user id

const app = express();
app.use(bodyParser.json());

// EventSub 驗證與通知處理
app.post('/eventsub', (req, res) => {
  const msgType = req.header('Twitch-Eventsub-Message-Type');
  if (msgType === 'webhook_callback_verification') {
    res.status(200).send(req.body.challenge);
    return;
  }
  if (msgType === 'notification') {
    const event = req.body.event;
    if (req.body.subscription.type === 'channel.follow') {
      const username = event.user_name;
      broadcast({ type: 'twitch_user_follow', username });
      console.log(`[Twitch] ${username} 追隨了你`);
    }
    res.sendStatus(200);
    return;
  }
  res.sendStatus(200);
});

app.listen(eventsubPort, () => {
  console.log(`Twitch EventSub webhook 伺服器運行於 http://localhost:${eventsubPort}/eventsub`);
});

// 取得 App Access Token
async function getAppAccessToken() {
  const resp = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
    params: {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    },
  });
  return resp.data.access_token;
}

// 註冊 EventSub 追隨事件
async function subscribeFollowEvent() {
  const token = await getAppAccessToken();
  await axios.post('https://api.twitch.tv/helix/eventsub/subscriptions', {
    type: 'channel.follow',
    version: '2',
    condition: {
      broadcaster_user_id: twitchUserId
    },
    transport: {
      method: 'webhook',
      callback: callbackUrl,
      secret: 'your_random_secret' // 可自訂
    }
  }, {
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });
  console.log('已訂閱 Twitch 追隨事件');
}

// 啟動時自動訂閱
subscribeFollowEvent().catch(e => console.error('訂閱追隨事件失敗:', e.response?.data || e));
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

// WebSocket 伺服器接收 admin.html 的模擬追隨訊息
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'twitch_user_follow' && data.username) {
        broadcast({ type: 'twitch_user_follow', username: data.username });
        console.log(`[模擬] ${data.username} 追隨了你`);
      }
    } catch (error) {
      console.error('WebSocket 處理訊息錯誤:', error);
    }
  });
});

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
