// Importa as bibliotecas necessárias
const express = require('express');
const cors = require('cors');
const https = require('https' ); // ✅ CORREÇÃO 1: Sintaxe do require corrigida

// Cria a aplicação Express
const app = express();

// Configurações do servidor
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Habilita CORS para todas as rotas
app.use(express.json()); // Habilita o parse do corpo da requisição como JSON

// ✅ CORREÇÃO 2: Rota principal do proxy ajustada para /api/lovable-proxy
app.post('/api/lovable-proxy', async (req, res) => { 
  try {
    // Extrai os dados do corpo da requisição vinda do n8n
    const { projectId, token, requestBody } = req.body;

    // Validação dos dados recebidos
    if (!projectId || !token || !requestBody) {
      return res.status(400).json({ error: 'projectId, token, e requestBody são obrigatórios.' });
    }

    // Monta o payload para a API da Lovable
    const lovablePayload = JSON.stringify(requestBody);

    // Configura as opções para a chamada à API da Lovable
    // ⚠️ PONTO DE ATENÇÃO: Mantendo o endpoint original que funcionava.
    // Se o erro persistir, este é o próximo local a ser investigado.
    const options = {
      hostname: 'api.lovable.dev',
      path: `/v1/projects/${projectId}/files`, // Endpoint original
      method: 'PATCH', // Método original
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(lovablePayload)
      }
    };

    // Faz a chamada para a API da Lovable
    const lovableReq = https.request(options, (lovableRes ) => {
      let data = '';
      lovableRes.on('data', (chunk) => {
        data += chunk;
      });
      lovableRes.on('end', () => {
        try {
          res.status(lovableRes.statusCode).json(JSON.parse(data));
        } catch {
          res.status(lovableRes.statusCode).send(data);
        }
      });
    });

    lovableReq.on('error', (error) => {
      console.error('Erro na chamada para a Lovable:', error);
      return res.status(500).json({ error: 'Erro interno ao chamar a API da Lovable.' });
    });

    // Envia o payload para a Lovable
    lovableReq.write(lovablePayload);
    lovableReq.end();

  } catch (error) {
    console.error('Erro ao processar a requisição:', error);
    return res.status(400).json({ error: 'Corpo da requisição inválido. Esperado um JSON.' });
  }
});

// Rota "catch-all" para qualquer outra requisição (retorna 404)
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada. A única rota ativa é POST /api/lovable-proxy` });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor proxy rodando na porta ${PORT}`);
});
