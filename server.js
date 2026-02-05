
server-completo.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

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
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy para Lovable com suporte a STREAMING
app.post('/api/lovable-proxy', async (req, res) => {
  try {
    const { projectId, token, requestBody } = req.body;

    // Validações
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'projectId é obrigatório'
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'token é obrigatório'
      });
    }

    console.log(`[PROXY] Requisição para projeto: ${projectId}`);
    console.log(`[PROXY] Body:`, JSON.stringify(requestBody).substring(0, 200));

    // Construir URL do Lovable
    const lovableUrl = `https://api.lovable.dev/projects/${projectId}/chat`;

    // Preparar headers
    const headers = {
      'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://lovable.dev',
      'Referer': 'https://lovable.dev/'
    };

    // Fazer requisição ao Lovable
    const lovableResponse = await fetch(lovableUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody || {}),
    });

    console.log(`[PROXY] Status da resposta: ${lovableResponse.status}`);
    console.log(`[PROXY] Content-Type: ${lovableResponse.headers.get('content-type')}`);

    // Verifica
