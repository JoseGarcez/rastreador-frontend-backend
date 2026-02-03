# 🚜 Rastreador de Tratores - Aplicação Web

Aplicação web completa para rastreamento de tratores em sites de leilão. Migração do script Python `rastreador_tratores_v6.py` para uma arquitetura moderna com Frontend (Netlify) e Backend (Render).

## 📁 Estrutura do Projeto

```
rastreador-tratores/
├── rastreador-tratores-backend/    # Backend Node.js + Express
│   ├── server.js                   # Servidor principal
│   └── package.json                # Dependências
├── rastreador-tratores-frontend/   # Frontend Vanilla JS
│   ├── index.html                  # Página principal
│   ├── style.css                   # Estilos
│   └── script.js                   # Lógica do frontend
└── README.md                       # Este arquivo
```

## 🚀 Deploy Rápido

### Backend no Render.com

1. **Crie uma conta** em [https://render.com](https://render.com)

2. **Novo Web Service:**
   - Clique em "New +" → "Web Service"
   - Conecte seu repositório GitHub/GitLab ou faça upload do ZIP

3. **Configure:**
   ```
   Name: rastreador-leilões-api
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. **Deploy:**
   - Clique em "Create Web Service"
   - Aguarde o deploy (2-3 minutos)
   - Anote a URL gerada (ex: `https://rastreador-tratores-api.onrender.com`)

### Frontend na Netlify

1. **Crie uma conta** em [https://netlify.com](https://netlify.com)

2. **Deploy:**
   - Arraste a pasta `rastreador-tratores-frontend` para a área de deploy
   - OU conecte seu repositório GitHub/GitLab

3. **Configuração da API:**
   - Edite `script.js` na linha 18
   - Altere `API_URL` para a URL do seu backend no Render:
   ```javascript
   const API_URL = 'https://rastreador-tratores-api.onrender.com';
   ```

4. **Redeploy:**
   - Faça commit/push da alteração
   - A Netlify fará deploy automático

## 🔌 Conectando Frontend e Backend

### 1. Configurar CORS no Backend

No arquivo `server.js`, há duas opções de CORS:

**Opção 1 - Qualquer origem (desenvolvimento):**
```javascript
app.use(cors());  // Já está ativo por padrão
```

**Opção 2 - Origem específica (produção):**
```javascript
// Comente a linha acima e descomente:
app.use(cors({
  origin: [
    'https://seu-site.netlify.app',  // Sua URL da Netlify
    'http://localhost:5500'           // Para testes locais
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 2. Configurar URL da API no Frontend

No arquivo `script.js`, linha 18:

```javascript
// ═══════════════════════════════════════════════════════════
// CONFIGURAÇÃO - ALTERE AQUI PARA CONECTAR AO SEU BACKEND
// ═══════════════════════════════════════════════════════════
const API_URL = 'https://rastreador-tratores-api.onrender.com';
// ═══════════════════════════════════════════════════════════
```

## 🖥️ Desenvolvimento Local

### Backend

```bash
cd rastreador-tratores-backend
npm install
npm start
# Servidor rodando em http://localhost:3000
```

### Frontend

```bash
cd rastreador-tratores-frontend
# Use qualquer servidor estático, ex:
npx serve .
# ou
python -m http.server 5500
# ou extensão Live Server do VS Code
```

## 📋 Funcionalidades

### Backend (Node.js + Express)

- ✅ **CORS configurado** para aceitar requisições do frontend
- ✅ **Lógica completa** do script Python original:
  - Varredura híbrida de links
  - Filtros de negativos (fortes e fracos)
  - Detecção de conteúdo JavaScript (Kron Leilões)
  - Contexto rico (texto do link + pai + avô + bisavô)
- ✅ **Endpoint `/api/scrape`**:
  - Recebe lista de URLs via POST
  - Retorna resultados em JSON
  - Suporta palavras-chave customizadas
- ✅ **Health check** em `/health`
- ✅ **Tratamento de erros** robusto

### Frontend (Vanilla JS)

- ✅ **Upload de arquivo** .txt com lista de sites
- ✅ **Input manual** de URLs
- ✅ **Gerenciamento de palavras-chave** (adicionar/remover)
- ✅ **Configurações avançadas** (negativos fortes/fracos)
- ✅ **Barra de progresso** em tempo real
- ✅ **Tabela de resultados** com:
  - Site
  - Termos encontrados
  - Descrição
  - Link clicável
- ✅ **Download de CSV** (formato compatível com Python)
- ✅ **Notificações toast** (sucesso/erro/aviso)
- ✅ **Design responsivo**

## 🔧 API Endpoints

### `GET /`
Retorna informações da API.

**Resposta:**
```json
{
  "status": "online",
  "message": "Rastreador de Tratores API",
  "version": "1.0.0"
}
```

### `GET /health`
Health check do servidor.

**Resposta:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 1234.56
}
```

### `POST /api/scrape`
Executa o scraping nos sites fornecidos.

**Body:**
```json
{
  "urls": [
    "https://www.kronleiloes.com.br",
    "https://www.centraldosleiloes.com.br"
  ],
  "palavrasChave": ["trator", "john deere"],
  "negativosFortes": ["scania", "onibus"],
  "negativosFracos": ["caminhão", "pneu"]
}
```

**Resposta:**
```json
{
  "success": true,
  "meta": {
    "totalSites": 2,
    "sitesProcessados": 2,
    "oportunidadesEncontradas": 15,
    "duracaoMs": 5432,
    "palavrasChaveUsadas": ["trator", "john deere"]
  },
  "data": [
    {
      "Site": "https://www.kronleiloes.com.br",
      "Termos": "trator, john deere",
      "Descricao": "Trator John Deere 5078E",
      "Link": "https://www.kronleiloes.com.br/lote/12345"
    }
  ]
}
```

## 📊 Formato do CSV

O arquivo CSV gerado segue o mesmo formato do script Python original:

```csv
Site;Termos;Descrição;Link
https://www.kronleiloes.com.br;trator, john deere;Trator John Deere 5078E;https://www.kronleiloes.com.br/lote/12345
```

- Codificação: UTF-8 com BOM
- Separador: Ponto-e-vírgula (`;`)
- Compatível com Excel em português

## 🔒 Segurança

- Limite de 500 URLs por requisição
- Limite de 50 palavras-chave
- Validação de URLs
- CORS configurável
- Timeouts de 30 segundos por site

## 🐛 Troubleshooting

### "Servidor offline" no frontend

1. Verifique se o backend está rodando
2. Confira a URL em `script.js` (linha 18)
3. Teste no navegador: `https://sua-url-render.com/health`

### CORS bloqueado

1. No backend, use `app.use(cors())` para testes
2. Em produção, configure as origens permitidas
3. Verifique se a URL da Netlify está na lista de origens

### Timeout nas requisições

- Sites de leilão podem ser lentos
- O backend tem timeout de 30s por site
- Reduza o número de URLs por lote

## 📝 Changelog

### v1.0.0
- Migração completa do Python para Node.js
- Frontend em Vanilla JS
- Deploy na Netlify + Render
- Feature parity com rastreador_tratores_v6.py

## 📄 Licença

MIT

---

Desenvolvido com ❤️ baseado no rastreador_tratores_v6.py
