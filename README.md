# 觀眾進出自動偵測系統

即時偵測聊天室觀眾進入與離開，提供 OBS 顯示畫面和後台監控介面。

## 功能特色

✨ **即時偵測** - WebSocket 即時通訊，零延遲顯示觀眾動態
🎬 **OBS 整合** - 專為 OBS 設計的歡迎訊息顯示頁面
📊 **後台監控** - 即時查看所有在線觀眾和活動記錄
🧪 **測試模擬** - 內建測試工具，方便開發調試

## 快速開始

### 1. 安裝相依套件

```bash
npm install
```

### 2. 啟動伺服器

```bash
npm start
```

### 3. 開啟頁面

- **OBS 顯示頁面**: http://localhost:3000/obs.html
- **後台管理頁面**: http://localhost:3000/admin.html

## 使用說明

### OBS 設定

1. 在 OBS 中新增「瀏覽器」來源
2. URL 設定為：`http://localhost:3000/obs.html`
3. 建議解析度：1920x1080
4. 勾選「控制音訊」（如果需要）
5. 調整圖層位置到最上層

### 後台管理

1. 開啟 `http://localhost:3000/admin.html`
2. 可以看到所有在線觀眾
3. 使用「測試模擬器」來測試歡迎訊息效果
4. 查看即時活動記錄

## 系統架構

```
├── server.js       # WebSocket 伺服器
├── obs.html        # OBS 顯示頁面（歡迎訊息）
├── admin.html      # 後台管理介面
└── package.json    # 專案設定
```

## API 說明

### WebSocket 訊息格式

#### 加入聊天室
```json
{
  "type": "join",
  "userId": "unique_user_id",
  "username": "用戶名稱"
}
```

#### 離開聊天室
```json
{
  "type": "leave",
  "userId": "unique_user_id"
}
```

#### 取得用戶列表
```json
{
  "type": "get_users"
}
```

## 自訂設定

### 修改歡迎訊息顯示時間

在 `obs.html` 中修改：
```javascript
await new Promise(resolve => setTimeout(resolve, 5000)); // 5000 = 5秒
```

### 修改伺服器埠號

在 `server.js` 中修改：
```javascript
const PORT = process.env.PORT || 3000; // 改成你想要的埠號
```

### 修改視覺樣式

直接編輯 HTML 檔案中的 `<style>` 區塊即可自訂顏色、字體、動畫等。

## 常見問題

**Q: OBS 顯示空白？**
A: 確認伺服器是否正在運行，檢查 URL 是否正確。

**Q: 後台看不到觀眾？**
A: 這是正常的，需要有實際用戶發送 join 訊息，可以使用測試模擬器來測試。

**Q: 如何整合到現有系統？**
A: 在你的聊天系統中使用 WebSocket 發送 join/leave 訊息到這個伺服器即可。

## 技術支援

- WebSocket: ws 8.16.0
- Node.js: 建議 14.0 以上版本

## 授權

MIT License
