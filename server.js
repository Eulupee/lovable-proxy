const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Lovable Proxy Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      proxy: '/api/lovable-proxy'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: options.method || 'POST',
      headers: options.headers || {}
    };

    const req = https.request(reqOptions, (res) => {
      const contentType = res.headers['content-type'] || '';
      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        resolve({ isStream: true, stream: res, headers: res.headers, status: res.statusCode });
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ isStream: false, data: data, headers: res.headers, status: res.statusCode }));
    });

    req.on('error', error => reject(error));
    if (body) req.write(body);
    req.end();
  });
}

app.post('/api/lovable-proxy', async (req, res) => {
  try {
    const { projectId, token, requestBody } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, error: 'projectId é obrigatório' });
    }

    if (!token) {
      return res.status(400).json({ success: false, error: 'token é obrigatório' });
    }

    console.log(`[PROXY] Projeto: ${projectId}`);

    const lovableUrl = `https://api.lovable.dev/projects/${projectId}/chat`;
    const headers = {
      'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': 'https://lovable.dev',
      'Referer': 'https://lovable.dev/'
    };

    const bodyString = JSON.stringify(requestBody || {});
    headers['Content-Length'] = Buffer.byteLength(bodyString);

    const response = await httpsRequest(lovableUrl, { method: 'POST', headers: headers }, bodyString);

    console.log(`[PROXY] Status: ${response.status}`);

    if (response.isStream) {
      console.log('[PROXY] Streaming');
      res.setHeader('Content-Type', response.headers['content-type']);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      response.stream.pipe(res);
      response.stream.on('end', () => console.log('[PROXY] Stream ended'));
      response.stream.on('error', (error) => console.error('[PROXY] Stream error:', error.message));
    } else {
      console.log('[PROXY] JSON');
      try {
        const jsonData = JSON.parse(response.data);
        return res.status(200).json({ success: response.status < 300, status: response.status, data: jsonData });
      } catch (e) {
        return res.status(200).json({ success: response.status < 300, status: response.status, data: response.data });
      }
    }
  } catch (error) {
    console.error('[PROXY] Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('=================================');
  console.log('🚀 SERVER STARTED!');
  console.log('=================================');
  console.log(`Port: ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Proxy: http://localhost:${PORT}/api/lovable-proxy`);
  console.log('=================================');
  console.log('');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('[ERROR]:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[REJECTED]:', reason);
  process.exit(1);
});
