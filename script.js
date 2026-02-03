/**
 * ============================================================
 * RASTREADOR DE TRATORES - FRONTEND (Vanilla JS)
 * ============================================================
 * 
 * CONFIGURAÇÃO DA API:
 * Altere a constante API_URL abaixo conforme seu ambiente:
 * 
 * - Desenvolvimento local: 'http://localhost:3000'
 * - Produção (Render): 'https://seu-app.onrender.com'
 * 
 * ============================================================
 */

// ═══════════════════════════════════════════════════════════
// CONFIGURAÇÃO - ALTERE AQUI PARA CONECTAR AO SEU BACKEND
// ═══════════════════════════════════════════════════════════
const API_URL = 'https://rastreador-leiloes-api-backend.onrender.com';  // ← ALTERE PARA SUA URL DO RENDER

// Exemplo de URL do Render:
// const API_URL = 'https://rastreador-tratores-api.onrender.com';
// ═══════════════════════════════════════════════════════════

/**
 * Palavras-chave padrão (do script Python original)
 */
const PALAVRAS_CHAVE_PADRAO = [
  'trator', 'tratores', 
  'massey ferguson', 'john deere', 'valtra', 'valmet', 
  'new holland', 'case ih', 'agrícola', 'agricola',
  'retroescavadeira', 'pá carregadeira', 'motocana',
  'plantadeira', 'colheitadeira', 'esteira', 'motoniveladora'
];

/**
 * Negativos fortes padrão
 */
const NEGATIVOS_FORTES_PADRAO = [
  'scania', 'iveco', 'daf', 'constellation', 'vw delivery', 'vw worker',
  'mercedes benz', 'volvo fh', 'volvo vm', 'onibus', 'ônibus', 'bus', 
  'micro-onibus', 'carcaça', 'sucata de ferro', 'sucata de motor'
];

/**
 * Negativos fracos padrão
 */
const NEGATIVOS_FRACOS_PADRAO = [
  'caminhão', 'caminhao', 'truck', 'cavalo mecânico', 
  'lote de pneu', 'jogo de pneu', 'pneus soltos', 
  'lote de peças', 'caixa de peças', 'manual do proprietário', 
  'catálogo', 'edital', 'condições de venda'
];

// Estado da aplicação
let state = {
  urls: [],
  keywords: [...PALAVRAS_CHAVE_PADRAO],
  isProcessing: false,
  abortController: null,
  results: []
};

// ═══════════════════════════════════════════════════════════
// INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  // Verifica conexão com o servidor
  checkServerStatus();
  
  // Inicializa palavras-chave padrão
  renderKeywords();
  
  // Inicializa configurações avançadas
  initializeAdvancedSettings();
  
  // Configura event listeners
  setupEventListeners();
  
  // Configura seção colapsável
  setupCollapsible();
}

// ═══════════════════════════════════════════════════════════
// VERIFICAÇÃO DO SERVIDOR
// ═══════════════════════════════════════════════════════════

async function checkServerStatus() {
  const statusEl = document.getElementById('server-status');
  const statusText = statusEl.querySelector('.status-text');
  
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      statusEl.classList.remove('checking', 'offline');
      statusEl.classList.add('online');
      statusText.textContent = 'Servidor conectado';
      updateSubmitButton();
    } else {
      throw new Error('Server error');
    }
  } catch (error) {
    statusEl.classList.remove('checking', 'online');
    statusEl.classList.add('offline');
    statusText.textContent = 'Servidor offline - Verifique a URL da API';
    showToast('Não foi possível conectar ao servidor. Verifique se o backend está rodando.', 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

function setupEventListeners() {
  // Upload de arquivo
  const fileInput = document.getElementById('sites-file');
  const fileLabel = document.querySelector('.file-label');
  
  fileInput.addEventListener('change', handleFileUpload);
  
  // Drag and drop
  fileLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileLabel.classList.add('dragover');
  });
  
  fileLabel.addEventListener('dragleave', () => {
    fileLabel.classList.remove('dragover');
  });
  
  fileLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    fileLabel.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFileUpload({ target: fileInput });
    }
  });
  
  // Remover arquivo
  document.getElementById('remove-file').addEventListener('click', removeFile);
  
  // Textarea de sites
  document.getElementById('sites-textarea').addEventListener('input', updateSubmitButton);
  
  // Palavras-chave
  document.getElementById('keyword-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  });
  
  document.getElementById('add-keyword').addEventListener('click', addKeyword);
  
  // Formulário
  document.getElementById('scrape-form').addEventListener('submit', handleSubmit);
  
  // Cancelar
  document.getElementById('btn-cancel').addEventListener('click', cancelScraping);
  
  // Download CSV
  document.getElementById('btn-download').addEventListener('click', downloadCSV);
  
  // Nova busca
  document.getElementById('btn-new-search').addEventListener('click', resetForm);
}

function setupCollapsible() {
  const header = document.querySelector('.collapsible-header');
  header.addEventListener('click', () => {
    header.classList.toggle('collapsed');
  });
}

// ═══════════════════════════════════════════════════════════
// UPLOAD DE ARQUIVO
// ═══════════════════════════════════════════════════════════

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.name.endsWith('.txt')) {
    showToast('Por favor, selecione um arquivo .txt', 'error');
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = (e) => {
    const content = e.target.result;
    const urls = parseUrls(content);
    
    state.urls = urls;
    
    // Atualiza UI
    document.querySelector('.file-name').textContent = file.name;
    document.querySelector('.file-count').textContent = `${urls.length} URL(s)`;
    document.getElementById('file-info').classList.remove('hidden');
    
    // Limpa textarea
    document.getElementById('sites-textarea').value = '';
    
    updateSubmitButton();
    showToast(`${urls.length} URL(s) carregada(s) do arquivo`, 'success');
  };
  
  reader.onerror = () => {
    showToast('Erro ao ler o arquivo', 'error');
  };
  
  reader.readAsText(file);
}

function removeFile() {
  document.getElementById('sites-file').value = '';
  document.getElementById('file-info').classList.add('hidden');
  state.urls = [];
  updateSubmitButton();
}

function parseUrls(content) {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.startsWith('http'))
    .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicados
}

// ═══════════════════════════════════════════════════════════
// PALAVRAS-CHAVE
// ═══════════════════════════════════════════════════════════

function renderKeywords() {
  const container = document.getElementById('keywords-list');
  container.innerHTML = '';
  
  state.keywords.forEach(keyword => {
    const tag = createKeywordTag(keyword);
    container.appendChild(tag);
  });
}

function createKeywordTag(keyword) {
  const tag = document.createElement('span');
  tag.className = 'keyword-tag';
  tag.innerHTML = `
    ${keyword}
    <button type="button" class="remove" title="Remover">×</button>
  `;
  
  tag.querySelector('.remove').addEventListener('click', () => {
    state.keywords = state.keywords.filter(k => k !== keyword);
    renderKeywords();
  });
  
  return tag;
}

function addKeyword() {
  const input = document.getElementById('keyword-input');
  const value = input.value.trim().toLowerCase();
  
  if (!value) return;
  
  if (state.keywords.includes(value)) {
    showToast('Esta palavra-chave já existe', 'warning');
    return;
  }
  
  state.keywords.push(value);
  renderKeywords();
  input.value = '';
}

// ═══════════════════════════════════════════════════════════
// CONFIGURAÇÕES AVANÇADAS
// ═══════════════════════════════════════════════════════════

function initializeAdvancedSettings() {
  document.getElementById('negativos-fortes').value = NEGATIVOS_FORTES_PADRAO.join(', ');
  document.getElementById('negativos-fracos').value = NEGATIVOS_FRACOS_PADRAO.join(', ');
}

function getNegativosFortes() {
  const value = document.getElementById('negativos-fortes').value;
  return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

function getNegativosFracos() {
  const value = document.getElementById('negativos-fracos').value;
  return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

// ═══════════════════════════════════════════════════════════
// CONTROLE DO FORMULÁRIO
// ═══════════════════════════════════════════════════════════

function updateSubmitButton() {
  const btn = document.getElementById('btn-scrape');
  const hasUrls = state.urls.length > 0 || document.getElementById('sites-textarea').value.trim().length > 0;
  const serverOnline = document.getElementById('server-status').classList.contains('online');
  
  btn.disabled = !hasUrls || !serverOnline || state.isProcessing;
}

function getAllUrls() {
  // URLs do arquivo
  let urls = [...state.urls];
  
  // URLs do textarea
  const textareaValue = document.getElementById('sites-textarea').value.trim();
  if (textareaValue) {
    const textareaUrls = parseUrls(textareaValue);
    urls = [...urls, ...textareaUrls];
  }
  
  // Remove duplicados
  return [...new Set(urls)];
}

// ═══════════════════════════════════════════════════════════
// SCRAPING
// ═══════════════════════════════════════════════════════════

async function handleSubmit(event) {
  event.preventDefault();
  
  const urls = getAllUrls();
  
  if (urls.length === 0) {
    showToast('Adicione pelo menos uma URL', 'error');
    return;
  }
  
  if (urls.length > 500) {
    showToast('Limite máximo de 500 URLs', 'error');
    return;
  }
  
  // Prepara estado
  state.isProcessing = true;
  state.abortController = new AbortController();
  state.results = [];
  
  // Atualiza UI
  updateSubmitButton();
  showProgressContainer();
  hideResultsContainer();
  
  // Configura progresso
  document.getElementById('progress-total').textContent = urls.length;
  document.getElementById('progress-current').textContent = '0';
  updateProgress(0);
  clearProgressLog();
  
  addProgressLog(`Iniciando análise de ${urls.length} sites...`, 'info');
  
  try {
    const response = await fetch(`${API_URL}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        urls: urls,
        palavrasChave: state.keywords,
        negativosFortes: getNegativosFortes(),
        negativosFracos: getNegativosFracos()
      }),
      signal: state.abortController.signal
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro na requisição');
    }
    
    const data = await response.json();
    
    // Simula progresso (já que não temos streaming)
    updateProgress(100);
    document.getElementById('progress-current').textContent = urls.length;
    
    // Processa resultados
    state.results = data.data || [];
    
    addProgressLog(`Análise concluída! ${state.results.length} oportunidades encontradas.`, 'success');
    
    // Mostra resultados
    setTimeout(() => {
      hideProgressContainer();
      showResults();
    }, 500);
    
    showToast(`Análise concluída! ${state.results.length} oportunidades encontradas.`, 'success');
    
  } catch (error) {
    if (error.name === 'AbortError') {
      addProgressLog('Análise cancelada pelo usuário.', 'warning');
      showToast('Análise cancelada', 'warning');
    } else {
      addProgressLog(`Erro: ${error.message}`, 'error');
      showToast(`Erro: ${error.message}`, 'error');
    }
    hideProgressContainer();
  } finally {
    state.isProcessing = false;
    state.abortController = null;
    updateSubmitButton();
  }
}

function cancelScraping() {
  if (state.abortController) {
    state.abortController.abort();
  }
}

// ═══════════════════════════════════════════════════════════
// PROGRESSO
// ═══════════════════════════════════════════════════════════

function showProgressContainer() {
  document.getElementById('progress-container').classList.remove('hidden');
}

function hideProgressContainer() {
  document.getElementById('progress-container').classList.add('hidden');
}

function updateProgress(percent) {
  document.getElementById('progress-fill').style.width = `${percent}%`;
  document.getElementById('progress-percent').textContent = `${Math.round(percent)}%`;
}

function clearProgressLog() {
  document.getElementById('progress-log').innerHTML = '';
}

function addProgressLog(message, type = 'info') {
  const log = document.getElementById('progress-log');
  const entry = document.createElement('div');
  entry.className = `progress-log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

// ═══════════════════════════════════════════════════════════
// RESULTADOS
// ═══════════════════════════════════════════════════════════

function showResultsContainer() {
  document.getElementById('results-container').classList.remove('hidden');
}

function hideResultsContainer() {
  document.getElementById('results-container').classList.add('hidden');
}

function showResults() {
  const tbody = document.getElementById('results-tbody');
  const noResults = document.getElementById('no-results');
  const countEl = document.getElementById('results-count');
  
  tbody.innerHTML = '';
  
  if (state.results.length === 0) {
    noResults.classList.remove('hidden');
    document.querySelector('.table-wrapper').classList.add('hidden');
    countEl.textContent = '0 oportunidades encontradas';
  } else {
    noResults.classList.add('hidden');
    document.querySelector('.table-wrapper').classList.remove('hidden');
    countEl.textContent = `${state.results.length} oportunidade(s) encontrada(s)`;
    
    state.results.forEach(result => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td title="${escapeHtml(result.Site)}">${escapeHtml(truncate(result.Site, 30))}</td>
        <td title="${escapeHtml(result.Termos)}">${escapeHtml(truncate(result.Termos, 30))}</td>
        <td title="${escapeHtml(result.Descricao)}">${escapeHtml(truncate(result.Descricao, 50))}</td>
        <td><a href="${escapeHtml(result.Link)}" target="_blank" rel="noopener">${escapeHtml(truncate(result.Link, 40))}</a></td>
      `;
      tbody.appendChild(row);
    });
  }
  
  showResultsContainer();
}

function resetForm() {
  // Limpa estado
  state.urls = [];
  state.results = [];
  
  // Limpa UI
  document.getElementById('sites-file').value = '';
  document.getElementById('file-info').classList.add('hidden');
  document.getElementById('sites-textarea').value = '';
  
  // Reseta palavras-chave
  state.keywords = [...PALAVRAS_CHAVE_PADRAO];
  renderKeywords();
  
  // Reseta configurações avançadas
  initializeAdvancedSettings();
  
  // Esconde resultados
  hideResultsContainer();
  
  // Atualiza botão
  updateSubmitButton();
  
  showToast('Formulário resetado', 'info');
}

// ═══════════════════════════════════════════════════════════
// DOWNLOAD CSV
// ═══════════════════════════════════════════════════════════

function downloadCSV() {
  if (state.results.length === 0) {
    showToast('Nenhum resultado para download', 'warning');
    return;
  }
  
  // Cabeçalho CSV (formato do Python: Site;Termos;Descrição;Link)
  const headers = ['Site', 'Termos', 'Descrição', 'Link'];
  
  // Converte dados para CSV
  const csvContent = [
    headers.join(';'),
    ...state.results.map(row => {
      return headers.map(header => {
        const value = row[header] || '';
        // Escapa valores que contêm ponto-e-vírgula ou aspas
        if (value.includes(';') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(';');
    })
  ].join('\n');
  
  // Adiciona BOM para UTF-8 (igual ao Python)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Cria link de download
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  link.href = URL.createObjectURL(blob);
  link.download = `resultado_tratores_${timestamp}.csv`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast('CSV baixado com sucesso!', 'success');
}

// ═══════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// ═══════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

function showToast(message, type = 'info', duration = 5000) {
  const container = document.getElementById('toast-container');
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
    <button type="button" class="toast-close">×</button>
  `;
  
  // Auto-remove
  const timeout = setTimeout(() => {
    removeToast(toast);
  }, duration);
  
  // Close button
  toast.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(timeout);
    removeToast(toast);
  });
  
  container.appendChild(toast);
}

function removeToast(toast) {
  toast.style.animation = 'slideIn 0.3s ease reverse';
  setTimeout(() => {
    toast.remove();
  }, 300);
}

// ═══════════════════════════════════════════════════════════
// EXPORTAÇÃO PARA TESTES (opcional)
// ═══════════════════════════════════════════════════════════

// Disponibiliza funções globais para debugging no console
window.RastreadorTratores = {
  state,
  API_URL,
  checkServerStatus,
  getAllUrls,
  downloadCSV
};

console.log('🚜 Rastreador de Tratores inicializado!');
console.log('API URL:', API_URL);
console.log('Para debugging, use: window.RastreadorTratores');
