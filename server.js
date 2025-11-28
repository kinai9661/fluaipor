// =================================================================================
//  Zeabur Express Adapter for Fluaipor
//  將 Cloudflare Worker 邏輯適配到 Express 服務器
//  支持持久化存儲掛載
// =================================================================================

import express from 'express';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 配置
const CONFIG = {
  PROJECT_NAME: "ai-generator-flux-ultimate",
  PROJECT_VERSION: "2.6.0",
  API_MASTER_KEY: process.env.API_MASTER_KEY || "1",
  UPSTREAM_ORIGIN: "https://ai-image-generator.co",
  STORAGE_PATH: process.env.STORAGE_PATH || '/data',
  
  MODELS: [
    "flux-schnell",
    "flux-1.1-pro",
    "flux-kontext-por"
  ],
  
  DEFAULT_MODEL: "flux-schnell",
  
  STYLES: {
    "realistic": "photorealistic, high detail, 8K, professional photography",
    "anime": "anime style, manga art, vibrant colors, Japanese animation",
    "cyberpunk": "cyberpunk aesthetic, neon lights, futuristic, dystopian",
    "oil-painting": "oil painting style, classical art, textured brushstrokes",
    "watercolor": "watercolor painting, soft colors, artistic, flowing",
    "3d-render": "3D render, Octane render, Unreal Engine, high quality CGI",
    "sketch": "pencil sketch, hand-drawn, black and white, artistic",
    "fantasy": "fantasy art, magical, epic, detailed illustration",
    "minimalist": "minimalist design, simple, clean, modern aesthetic",
    "nsfw": "artistic nudity, mature content, sensual, adult themes"
  }
};

// 中間件
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ==================== 文件存儲管理器 ====================
class FileStorageManager {
  constructor(storagePath) {
    this.storagePath = storagePath;
    this.historyFile = path.join(storagePath, 'history.json');
    this.initStorage();
  }

  async initStorage() {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
      try {
        await fs.access(this.historyFile);
      } catch {
        await fs.writeFile(this.historyFile, '[]');
      }
      console.log(`✅ Storage initialized at: ${this.storagePath}`);
    } catch (e) {
      console.error('❌ Storage initialization failed:', e);
    }
  }

  async saveRecord(record) {
    try {
      const data = await this.getAllRecords();
      const newRecord = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        date: new Date().toISOString(),
        ...record
      };
      data.unshift(newRecord);
      
      // 只保留最近 1000 條
      if (data.length > 1000) data.splice(1000);
      
      await fs.writeFile(this.historyFile, JSON.stringify(data, null, 2));
      return { success: true, id: newRecord.id, record: newRecord };
    } catch (e) {
      console.error('Save record failed:', e);
      return { success: false, error: e.message };
    }
  }

  async getAllRecords() {
    try {
      const data = await fs.readFile(this.historyFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async getRecords(limit = 50, offset = 0) {
    const all = await this.getAllRecords();
    return {
      records: all.slice(offset, offset + limit),
      total: all.length,
      hasMore: offset + limit < all.length
    };
  }

  async deleteRecord(id) {
    try {
      const data = await this.getAllRecords();
      const filtered = data.filter(r => r.id !== id);
      await fs.writeFile(this.historyFile, JSON.stringify(filtered, null, 2));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async getStats() {
    const records = await this.getAllRecords();
    const stats = {
      total: records.length,
      byModel: {},
      byStyle: {},
      totalImages: 0
    };

    records.forEach(r => {
      stats.byModel[r.model] = (stats.byModel[r.model] || 0) + 1;
      if (r.style) stats.byStyle[r.style] = (stats.byStyle[r.style] || 0) + 1;
      stats.totalImages += (r.imageUrls?.length || 0);
    });

    return stats;
  }
}

const storage = new FileStorageManager(CONFIG.STORAGE_PATH);

// ==================== 工具函數 ====================
class Logger {
  constructor() { this.logs = []; }
  add(step, data) {
    this.logs.push({ 
      time: new Date().toISOString().split('T')[1].slice(0, -1), 
      step, 
      data 
    });
    console.log(`[${step}]`, data);
  }
  get() { return this.logs; }
}

function generateFingerprint() {
  return Array.from({length: 32}, () => 
    '0123456789abcdef'[Math.floor(Math.random() * 16)]
  ).join('');
}

function generateRandomIP() {
  return Array.from({length: 4}, () => Math.floor(Math.random() * 255)).join('.');
}

function getFakeHeaders(fingerprint, anonUserId) {
  const fakeIP = generateRandomIP();
  return {
    headers: {
      "accept": "*/*",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
      "content-type": "application/json",
      "origin": CONFIG.UPSTREAM_ORIGIN,
      "referer": `${CONFIG.UPSTREAM_ORIGIN}/`,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "X-Forwarded-For": fakeIP,
      "X-Real-IP": fakeIP,
      "CF-Connecting-IP": fakeIP,
      "Cookie": `anon_user_id=${anonUserId};`
    },
    fakeIP
  };
}

function verifyAuth(req) {
  if (CONFIG.API_MASTER_KEY === "1") return true;
  const auth = req.headers.authorization;
  return auth && auth === `Bearer ${CONFIG.API_MASTER_KEY}`;
}

// ==================== 核心生成邏輯 ====================
async function performUpstreamGeneration(params, logger) {
  const { prompt, model, aspectRatio, numOutputs = 1, style } = params;
  
  let enhancedPrompt = prompt;
  if (style && CONFIG.STYLES[style]) {
    enhancedPrompt = `${prompt}, ${CONFIG.STYLES[style]}`;
  }
  
  const fingerprint = generateFingerprint();
  const anonUserId = crypto.randomUUID();
  const { headers, fakeIP } = getFakeHeaders(fingerprint, anonUserId);
  
  logger.add("Identity Created", { fingerprint, anonUserId, fakeIP });

  const credits = model === "flux-1.1-pro" ? numOutputs * 2 : numOutputs;
  
  try {
    await fetch(`${CONFIG.UPSTREAM_ORIGIN}/api/credits/deduct`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        trans_type: "image_generation",
        credits,
        model,
        numOutputs,
        fingerprint_id: fingerprint
      })
    });
  } catch (e) {
    logger.add("Deduct Error", e.message);
  }

  const formData = new FormData();
  formData.append("prompt", enhancedPrompt);
  formData.append("model", model);
  formData.append("num_outputs", numOutputs.toString());
  formData.append("inputMode", "text");
  formData.append("style", style || "auto");
  formData.append("aspectRatio", aspectRatio || "1:1");
  formData.append("fingerprint_id", fingerprint);
  formData.append("provider", "replicate");

  const genHeaders = { ...headers };
  delete genHeaders["content-type"];

  const response = await fetch(`${CONFIG.UPSTREAM_ORIGIN}/api/gen-image`, {
    method: "POST",
    headers: genHeaders,
    body: formData
  });

  const data = await response.json();
  logger.add("Upstream Response", data);

  if (!response.ok || data.code !== 0) {
    throw new Error(data.message || "Generation failed");
  }

  return data.data.map(img => img.url);
}

// ==================== 路由 ====================

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: CONFIG.PROJECT_VERSION,
    storage: CONFIG.STORAGE_PATH
  });
});

// 主頁
app.get('/', (req, res) => {
  res.send(`
    <html>
    <head><title>Fluaipor on Zeabur</title></head>
    <body style="font-family: sans-serif; max-width: 800px; margin: 50px auto; padding: 20px;">
      <h1>🎨 Fluaipor API - Zeabur Edition</h1>
      <p><strong>Version:</strong> ${CONFIG.PROJECT_VERSION}</p>
      <p><strong>Status:</strong> ✅ Running</p>
      <p><strong>Storage:</strong> ${CONFIG.STORAGE_PATH}</p>
      <hr>
      <h2>API Endpoints</h2>
      <ul>
        <li>POST /v1/chat/completions</li>
        <li>POST /v1/images/generations</li>
        <li>GET /v1/history</li>
        <li>GET /v1/models</li>
        <li>GET /v1/styles</li>
      </ul>
    </body>
    </html>
  `);
});

// 聊天接口
app.post('/v1/chat/completions', async (req, res) => {
  if (!verifyAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

  const logger = new Logger();
  try {
    const { messages, n = 1, style, model = CONFIG.DEFAULT_MODEL, size = "1:1" } = req.body;
    const lastMsg = messages[messages.length - 1];
    
    let prompt = typeof lastMsg.content === 'string' ? lastMsg.content : 
      lastMsg.content.filter(p => p.type === 'text').map(p => p.text).join(' ');

    const imageUrls = await performUpstreamGeneration({
      prompt, model, aspectRatio: size, numOutputs: Math.min(n, 4), style
    }, logger);

    await storage.saveRecord({
      prompt, model, style: style || 'none', aspectRatio: size,
      numImages: imageUrls.length, imageUrls, success: true
    });

    const content = imageUrls.map(url => `![Image](${url})`).join('\n\n');
    
    res.json({
      id: `chat-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }]
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 圖片生成接口
app.post('/v1/images/generations', async (req, res) => {
  if (!verifyAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

  const logger = new Logger();
  try {
    const { prompt, n = 1, style, model = CONFIG.DEFAULT_MODEL, size = "1:1" } = req.body;

    const imageUrls = await performUpstreamGeneration({
      prompt, model, aspectRatio: size, numOutputs: Math.min(n, 4), style
    }, logger);

    await storage.saveRecord({
      prompt, model, style: style || 'none', aspectRatio: size,
      numImages: imageUrls.length, imageUrls, success: true
    });

    res.json({
      created: Math.floor(Date.now() / 1000),
      data: imageUrls.map(url => ({ url }))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 歷史記錄
app.get('/v1/history', async (req, res) => {
  if (!verifyAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  
  const result = await storage.getRecords(limit, offset);
  res.json(result);
});

// 刪除記錄
app.delete('/v1/history/:id', async (req, res) => {
  if (!verifyAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  const result = await storage.deleteRecord(req.params.id);
  res.json(result);
});

// 統計數據
app.get('/v1/history/stats', async (req, res) => {
  if (!verifyAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  const stats = await storage.getStats();
  res.json(stats);
});

// 模型列表
app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: CONFIG.MODELS.map(id => ({ id, object: 'model', owned_by: 'fluaipor' }))
  });
});

// 風格列表
app.get('/v1/styles', (req, res) => {
  res.json({
    styles: Object.keys(CONFIG.STYLES).map(key => ({
      id: key,
      name: key.replace('-', ' '),
      description: CONFIG.STYLES[key]
    }))
  });
});

// 啟動服務器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Fluaipor server running on port ${PORT}`);
  console.log(`📁 Storage path: ${CONFIG.STORAGE_PATH}`);
  console.log(`🔑 API Key: ${CONFIG.API_MASTER_KEY === '1' ? 'NOT SET (Using default)' : 'Configured'}`);
});
