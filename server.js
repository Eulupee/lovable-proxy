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

// Proxy para Lovable
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

    console.log(`Proxy request para projeto: ${projectId}`);

    // Construir URL do Lovable
    const lovableUrl = `https://api.lovable.dev/projects/${projectId}/chat`;

    // Preparar headers
    const headers = {
      'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    // Fazer requisição ao Lovable
    const lovableResponse = await fetch(lovableUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody || {}),
    });

    const responseData = await lovableResponse.json();

    // Log do status
    console.log(`Lovable response status: ${lovableResponse.status}`);

    // Retornar resposta
    return res.status(200).json({
      success: lovableResponse.ok,
      status: lovableResponse.status,
      data: responseData,
    });

  } catch (error) {
    console.error('Erro no proxy:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Autorização (opcional - para compatibilidade com seu sistema anterior)
app.post('/api/radioai-authorization', async (req, res) => {
  try {
    const { identificador } = req.body;

    if (!identificador) {
      return res.status(400).json({
        error: 'Identificador é obrigatório'
      });
    }

    // Gerar token simples (você pode implementar JWT aqui se quiser)
    const token = Buffer.from(`${identificador}:${Date.now()}`).toString('base64');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return res.json({
      success: true,
      token: token,
      expires_at: expiresAt
    });

  } catch (error) {
    console.error('Erro na autorização:', error.message);
    return res.status(500).json({
      error: error.message
    });
  }
});

// Tratamento de rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.path
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor proxy iniciado!`);
  console.log(`📡 Rodando em: http://localhost:${PORT}`);
  console.log(`🔗 Endpoint proxy: http://localhost:${PORT}/api/lovable-proxy`);
  console.log(`✅ Health check: http://localhost:${PORT}/health\n`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada não tratada:', reason);
});
