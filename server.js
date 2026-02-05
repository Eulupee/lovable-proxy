const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Lovable Proxy Server',
    timestamp: new Date().toISOString() 
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Função para fazer requisição HTTPS manualmente
function makeHttpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'POST',
      headers: options.headers || {}
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';

      // Se for streaming
      if (res.headers['content-type']?.includes('text/event-stream') || 
          res.headers['content-type']?.includes('text/plain')) {
        resolve({ stream: res, headers: res.headers, status: res.statusCode });
        return;
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({ 
          data: data, 
          headers: res.headers, 
          status: res.statusCode 
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

// Proxy para Lovable com suporte a STREAMING
app.post('/api/lovable-proxy', async (req, res) => {
  try {
    const { projectId, token, requestBody } = req.body;

    // Validações
    if (!projectId) {
      return res.stat
      
