# 🎨 AI Generator Flux Ultimate (v2.6.0)

<div align="center">

![版本](https://img.shields.io/badge/版本-v2.6.0-f59e0b?style=for-the-badge&logo=star&logoColor=white)
![許可證](https://img.shields.io/badge/許可證-Apache_2.0-3b82f6?style=for-the-badge&logo=apache&logoColor=white)
![部署](https://img.shields.io/badge/部署-Multi_Platform-orange?style=for-the-badge)
![模型](https://img.shields.io/badge/模型-Flux_Pro-brightgreen?style=for-the-badge&logo=ai&logoColor=white)

**全功能 AI 繪畫 API 轉換器 · 支持多圖生成 + 風格預設 + 歷史記錄 + NSFW**

[![部署到 Cloudflare](https://img.shields.io/badge/🚀_Cloudflare-Workers-ff6900?style=for-the-badge&logo=cloudflare&logoColor=white)](https://deploy.workers.cloudflare.com/?url=https://github.com/kinai9661/fluaipor)
[![部署到 Zeabur](https://img.shields.io/badge/🚀_Zeabur-一鍵部署-7c3aed?style=for-the-badge)](https://zeabur.com)

</div>

---

## ✨ 新功能亮點 (v2.6.0)

<div align="center">

| 🖼️ 多圖生成 | 🎨 風格預設 | 📚 歷史記錄 | 🔞 NSFW 支持 |
|:---:|:---:|:---:|:---:|
| **1-4 張圖片**<br>一次生成多張 | **10 種風格**<br>預設模板 | **雲端存儲**<br>持久保存 | **成人模型**<br>合法支持 |

</div>

### 🎆 核心特性

- **✨ 多張圖片生成**: 一次生成 1-4 張圖片，提升效率
- **🎨 風格預設系統**: 10 種內置藝術風格（寫實、動漫、跭博龐克等）
- **📚 完整歷史記錄**: Cloudflare KV / Zeabur 持久化存儲
- **📊 統計分析**: 按模型、風格、日期分類統計
- **📥 數據導出**: 支持 JSON/CSV 格式導出
- **🔞 成人內容**: 支持 Flux Adult 模型（flux-kontext-por）
- **🗑️ 記錄管理**: 單筆刪除、批量導出

---

## 🚀 快速開始

### 方案 A：Cloudflare Workers（推薦 - 免費）

✅ **優勢**：全球 CDN、極低延遲、每日 10萬請求免費

1. **點擊一鍵部署** → 登入 Cloudflare 帳戶
2. **配置環境變量**：`API_MASTER_KEY`
3. **完成部署** 🎉

📚 **詳細教程**：查看 [Cloudflare 部署指南](#cloudflare-workers-部署)

### 方案 B：Zeabur（推薦 - 持久化存儲）

✅ **優勢**：持久化硬碟、自動部署、無需配置

1. **Fork 本倉庫**
2. **連接 Zeabur** 到你的 GitHub
3. **掛載硬碟** 至 `/data` 目錄
4. **設定環境變量**

📚 **詳細教程**：查看 [Zeabur 部署指南](ZEABUR_DEPLOYMENT.md)

### 方案 C：手動部署

```bash
# 克隆倉庫
git clone https://github.com/kinai9661/fluaipor.git
cd fluaipor

# Cloudflare Workers
wrangler login
wrangler deploy

# Zeabur (本地測試)
npm install
npm start
```

---

## 📊 部署平台對比

| 特性 | Cloudflare Workers | Zeabur |
|------|-------------------|--------|
| **費用** | ✅ 免費 (10萬請求/天) | 💵 $5/月起 |
| **持久化存儲** | KV (1GB 免費) | ✅ 硬碟 (1GB+) |
| **部署速度** | ⚡️ 極快 (< 1分鐘) | 🐌 中等 (2-3分鐘) |
| **全球 CDN** | ✅ 內建 | ❌ 需額外配置 |
| **自動部署** | ❌ 手動 | ✅ Git Push 自動 |
| **適用場景** | 高併發、無狀態 | 需持久化、全功能 |

---

## 🛠️ Cloudflare Workers 部署

### 快速部署

```bash
# 安裝 Wrangler
npm install -g wrangler

# 登入 Cloudflare
wrangler login

# 部署
wrangler deploy
```

### KV 存儲配置（啟用歷史記錄）

```bash
# 創建 KV Namespace
wrangler kv:namespace create "IMAGE_HISTORY"

# 編輯 wrangler.toml
[[kv_namespaces]]
binding = "IMAGE_HISTORY"
id = "YOUR_KV_NAMESPACE_ID"

# 重新部署
wrangler deploy
```

---

## ⚙️ 環境變量配置

### 必須變量

| 變量名 | 說明 | 預設值 |
|----------|------|----------|
| `API_MASTER_KEY` | API 訪問密鑰 | `1` (不安全) |

### 可選變量 (Zeabur)

| 變量名 | 說明 | 預設值 |
|----------|------|----------|
| `PORT` | 服務端口 | `3000` |
| `STORAGE_PATH` | 存儲路徑 | `/data` |

**設定方法**：
- **Cloudflare**: Dashboard → Workers → Settings → Variables
- **Zeabur**: Dashboard → Service → Variables

---

## 🎮 使用指南

### 1. 🌐 Web 界面

訪問你的部署地址：

```
https://your-worker.workers.dev  # Cloudflare
https://your-app.zeabur.app     # Zeabur
```

**功能面板**：
- 🖼️ **Gallery**: 圖片生成主面板
- 📚 **History**: 歷史記錄瀏覽
- 📊 **Stats**: 統計數據分析

### 2. 🤖 API 端點

#### 聊天接口（支持多圖）
```bash
curl -X POST https://your-api.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "flux-1.1-pro",
    "messages": [{"role": "user", "content": "a cyberpunk city"}],
    "n": 3,
    "style": "cyberpunk"
  }'
```

#### 圖片生成接口
```bash
curl -X POST https://your-api.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a beautiful sunset",
    "model": "flux-schnell",
    "n": 2,
    "size": "16:9",
    "style": "realistic"
  }'
```

#### 歷史記錄 API
```bash
# 獲取歷史
GET /v1/history?limit=50

# 導出記錄
GET /v1/history/export?format=json
GET /v1/history/export?format=csv

# 刪除記錄 (Zeabur)
DELETE /v1/history/{id}

# 統計數據
GET /v1/history/stats
```

---

## 🎨 風格預設

| 風格 ID | 名稱 | 描述 |
|---------|------|------|
| `realistic` | 寫實風 | 高清照片質感，8K 解析度 |
| `anime` | 動漫風 | 日本動漫藝術風格 |
| `cyberpunk` | 跭博龐克 | 未來城市、霸虹燈 |
| `oil-painting` | 油畫風 | 古典藝術質感 |
| `watercolor` | 水彩風 | 柔和色彩、藝術感 |
| `3d-render` | 3D 渲染 | Unreal Engine 高品質 CGI |
| `sketch` | 素描風 | 醉筆手繪風格 |
| `fantasy` | 奇幻風 | 魔幻史詩風格 |
| `minimalist` | 極簡風 | 現代簡約設計 |
| `nsfw` | 成人風 🔞 | 藝術裸體、成熟主題 |

---

## 📊 模型對比

| 模型 | 速度 | 品質 | 費用 | 特點 |
|------|------|------|------|------|
| `flux-schnell` | ⚡️ 快 | ⭐️⭐️⭐️ | 1 學分 | 適合快速生成 |
| `flux-1.1-pro` | 🐢 中 | ⭐️⭐️⭐️⭐️⭐️ | 2 學分 | 專業級品質 |
| `flux-kontext-por` | ⚡️ 快 | ⭐️⭐️⭐️⭐️ | 1 學分 | 成人內容 🔞 |

---

## ⚠️ 重要提醒

### 成人內容使用聲明

本項目支持成人內容模型（`flux-kontext-por`），**但請務必遵守以下規定**：

1. ✅ **合法使用**: 僅在法律允許的地區使用
2. ✅ **年齡限制**: 使用者必須年滿 18 歲
3. ❌ **禁止用途**: 不得用於非法、不道德的目的
4. ⚠️ **責任聲明**: 開發者不對濱用行為負責

### 技術風險

- 本項目涉及請求偽造技術，可能違反目標服務的使用條款
- 仅供學習研究使用，不建議用於生產環境
- 使用前請充分了解相關法律風險

---

## 🔧 故障排除

### 常見問題

| 問題 | 解決方案 |
|------|----------|
| 🚫 401 認證失敗 | 檢查 `API_MASTER_KEY` 環境變量 |
| 🐢 響應超時 | 等待上游服務恢復 |
| 💸 積分不足 | 等待額度重置 |
| 💾 KV 不可用 | 自動降級到 LocalStorage |

📚 **更多故障排除**：查看 [Zeabur 部署指南](ZEABUR_DEPLOYMENT.md#故障排除)

---

## 🔜 更新日誌

### v2.6.0 (2025-11-28)
- ✨ 新增多張圖片生成功能
- 🎨 新增 10 種風格預設
- 📚 新增完整歷史記錄系統
- 🔞 支持成人內容模型
- 📊 新增統計分析面板
- 📥 支持 JSON/CSV 導出
- 🚀 支持 Zeabur 部署

---

## 👥 貢獻

歡迎提交 Issue 和 Pull Request！

---

## 📜 許可證

Apache License 2.0

---

<div align="center">

## 🎉 開始使用

**讓 AI 賦能你的創意**

[![Cloudflare](https://img.shields.io/badge/🌐_Cloudflare-全球加速-ff6900?style=for-the-badge)](https://deploy.workers.cloudflare.com/?url=https://github.com/kinai9661/fluaipor)
[![Zeabur](https://img.shields.io/badge/💾_Zeabur-持久化存儲-7c3aed?style=for-the-badge)](ZEABUR_DEPLOYMENT.md)

*✨ 星辰大海，代碼為舟，創意作帆 🚀*

</div>