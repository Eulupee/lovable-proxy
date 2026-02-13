// ============================================
// LOVABLE PROXY SERVER - VERSÃO FINAL
// ============================================

const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARES
// ============================================

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Logger - Mostra TODAS as requisições que chegam
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📥 REQUISIÇÃO RECEBIDA [${timestamp}]`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Método: ${req.method}`);
  console.log(`Path: ${req.path}`);
  console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`Body:`, JSON.stringify(req.body, null, 2));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  next();
});

// ============================================
// ROTAS
// ============================================

// Health Check - GET /
app.get('/', (req, res) => {
  console.log('✅ Health check acessado');
  res.json({ 
    status: 'online',
    message: 'Lovable Proxy Server está rodando!',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /',
      proxy: 'POST /api/lovable-proxy'
    }
  });
});

// Health Check alternativo - GET /health
app.get('/health', (req, res) => {
  console.log('✅ Health check alternativo acessado');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rota Principal do Proxy - POST /api/lovable-proxy
app.post('/api/lovable-proxy', async (req, res) => {
  console.log('🚀 Rota /api/lovable-proxy acessada!');
  
  try {
    // Extrair dados do body
    const { projectId, token, requestBody } = req.body;

    // Log dos dados recebidos
    console.log('📦 Dados recebidos:');
    console.log('  - projectId:', projectId || '❌ AUSENTE');
    console.log('  - token:', token ? `✅ Presente (${token.substring(0, 20)}...)` : '❌ AUSENTE');
    console.log('  - requestBody:', requestBody ? '✅ Presente' : '❌ AUSENTE');

    // Validação
    if (!projectId) {
      console.error('❌ ERRO: projectId não fornecido');
      return res.status(400).json({ 
        success: false,
        error: 'projectId é obrigatório',
        received: { projectId, hasToken: !!token, hasRequestBody: !!requestBody }
      });
    }

    if (!token) {
      console.error('❌ ERRO: token não fornecido');
      return res.status(400).json({ 
        success: false,
        error: 'token é obrigatório',
        received: { projectId, hasToken: !!token, hasRequestBody: !!requestBody }
      });
    }

    if (!requestBody) {
      console.error('❌ ERRO: requestBody não fornecido');
      return res.status(400).json({ 
        success: false,
        error: 'requestBody é obrigatório',
        received: { projectId, hasToken: !!token, hasRequestBody: !!requestBody }
      });
    }

    console.log('✅ Validação OK - Preparando chamada para Lovable API');

    // Preparar o payload
    const lovablePayload = JSON.stringify(requestBody);
    console.log(`📤 Payload size: ${lovablePayload.length} bytes`);

    // Configurar a requisição para a Lovable API
    // TESTANDO MÚLTIPLOS ENDPOINTS
    const endpoints = [
      { path: `/projects/${projectId}/chat`, method: 'POST' },
      { path: `/v1/projects/${projectId}/chat`, method: 'POST' },
      { path: `/v1/projects/${projectId}/files`, method: 'PATCH' }
    ];

    // Por enquanto, usar o primeiro
    const endpoint = endpoints[0];
    
    const options = {
      hostname: 'api.lovable.dev',
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(lovablePayload),
        'User-Agent': 'Lovable-Proxy/2.0',
        'Origin': 'https://lovable.dev',
        'Referer': 'https://lovable.dev/'
      }
    };

    console.log('🌐 Chamando Lovable API:');
    console.log(`  - URL: https://${options.hostname}${options.path}`);
    console.log(`  - Método: ${options.method}`);

    // Fazer a requisição
    const lovableReq = https.request(options, (lovableRes) => {
      let data = '';
      
      lovableRes.on('data', (chunk) => {
        data += chunk;
      });
      
      lovableRes.on('end', () => {
        console.log('📨 Resposta da Lovable API recebida:');
        console.log(`  - Status: ${lovableRes.statusCode}`);
        console.log(`  - Data length: ${data.length} bytes`);
        
        // Tentar parsear como JSON
        try {
          const jsonData = JSON.parse(data);
          console.log('✅ Resposta em JSON parseada com sucesso');
          
          res.status(lovableRes.statusCode).json({
            success: lovableRes.statusCode < 300,
            status: lovableRes.statusCode,
            data: jsonData
          });
        } catch (parseError) {
          console.log('⚠️ Resposta não é JSON válido, retornando como texto');
          
          res.status(lovableRes.statusCode).json({
            success: lovableRes.statusCode < 300,
            status: lovableRes.statusCode,
            data: data
          });
        }
      });
    });

    // Handlers de erro
    lovableReq.on('error', (error) => {
      console.error('💥 ERRO na requisição para Lovable:', error.message);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao chamar a API da Lovable',
        details: error.message
      });
    });

    // Timeout de 30 segundos
    lovableReq.setTimeout(30000, () => {
      lovableReq.destroy();
      console.error('⏰ TIMEOUT na requisição para Lovable');
      return res.status(504).json({ 
        success: false,
        error: 'Timeout ao chamar a API da Lovable' 
      });
    });

    // Enviar o payload
    lovableReq.write(lovablePayload);
    lovableReq.end();

  } catch (error) {
    console.error('💥 ERRO ao processar requisição:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  console.log(`❌ 404 - Rota não encontrada: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Rota não encontrada',
    receivedPath: req.path,
    receivedMethod: req.method,
    availableRoutes: [
      'GET / (health check)',
      'GET /health (health check)',
      'POST /api/lovable-proxy (proxy endpoint)'
    ]
  });
});

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║                                                ║');
  console.log('║     🚀 LOVABLE PROXY SERVER STARTED! 🚀       ║');
  console.log('║                                                ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📍 Porta: ${PORT}`);
  console.log(`📍 Host: 0.0.0.0`);
  console.log(`📍 Health: http://localhost:${PORT}/`);
  console.log(`📍 Proxy: http://localhost:${PORT}/api/lovable-proxy`);
  console.log('');
  console.log('✅ Servidor pronto para receber requisições!');
  console.log('');
});

// ============================================
// PROCESS HANDLERS
// ============================================

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido - Encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION:', reason);
  process.exit(1);
});
