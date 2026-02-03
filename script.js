/**
 * RASTREADOR DE TRATORES - FRONTEND REFATORADO (Vanilla JS)
 */

const CONFIG = {
  API_URL: 'https://rastreador-leiloes-api-backend.onrender.com', // Ajuste conforme necessário
  DEFAULTS: {
    KEYWORDS: ['trator', 'massey ferguson', 'john deere', 'valtra'],
    STRONG_NEG: ['scania', 'iveco', 'onibus', 'sucata de ferro'],
    WEAK_NEG: ['caminhão', 'pneu', 'peças']
  }
};

class App {
  constructor() {
    this.state = {
      urls: new Set(), // Set evita duplicatas automaticamente
      keywords: new Set(CONFIG.DEFAULTS.KEYWORDS),
      results: [],
      isProcessing: false,
      abortController: null
    };

    this.elements = {
      form: document.getElementById('scrape-form'),
      fileInput: document.getElementById('sites-file'),
      urlInput: document.getElementById('sites-textarea'),
      keywordInput: document.getElementById('keyword-input'),
      keywordList: document.getElementById('keywords-list'),
      addKeywordBtn: document.getElementById('add-keyword'),
      btnScrape: document.getElementById('btn-scrape'),
      resultsTableBody: document.getElementById('results-tbody'),
      progressContainer: document.getElementById('progress-container'),
      resultsContainer: document.getElementById('results-container'),
      btnDownload: document.getElementById('btn-download')
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.renderKeywords();
    this.checkServer();
  }

  setupEventListeners() {
    // File Upload
    this.elements.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    
    // Keywords
    this.elements.addKeywordBtn.addEventListener('click', () => this.addKeyword());
    this.elements.keywordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.addKeyword(); }
    });

    // Form Submit
    this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Download
    this.elements.btnDownload.addEventListener('click', () => this.downloadCSV());
  }

  async checkServer() {
    try {
      const res = await fetch(`${CONFIG.API_URL}/health`);
      if (res.ok) this.updateStatus(true);
      else throw new Error();
    } catch {
      this.updateStatus(false);
    }
  }

  updateStatus(isOnline) {
    const el = document.getElementById('server-status');
    el.className = `server-status ${isOnline ? 'online' : 'offline'}`;
    el.querySelector('.status-text').textContent = isOnline ? 'Servidor Online' : 'Servidor Offline';
    this.elements.btnScrape.disabled = !isOnline;
  }

  handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith('.txt')) return alert('Use arquivos .txt');

    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split('\n');
      lines.forEach(line => {
        const url = line.trim();
        if (url.startsWith('http')) this.state.urls.add(url);
      });
      this.updateUrlCount();
    };
    reader.readAsText(file);
  }

  addKeyword() {
    const val = this.elements.keywordInput.value.trim().toLowerCase();
    if (val && !this.state.keywords.has(val)) {
      this.state.keywords.add(val);
      this.renderKeywords();
      this.elements.keywordInput.value = '';
    }
  }

  renderKeywords() {
    this.elements.keywordList.innerHTML = ''; // Limpa container
    const frag = document.createDocumentFragment();
    
    this.state.keywords.forEach(kw => {
      const tag = document.createElement('span');
      tag.className = 'keyword-tag';
      tag.textContent = kw;
      
      const btn = document.createElement('button');
      btn.textContent = '×';
      btn.className = 'remove';
      btn.onclick = () => {
        this.state.keywords.delete(kw);
        this.renderKeywords();
      };
      
      tag.appendChild(btn);
      frag.appendChild(tag);
    });
    
    this.elements.keywordList.appendChild(frag);
  }

  updateUrlCount() {
    // Lógica para mesclar URLs do textarea e do arquivo
    const textUrls = this.elements.urlInput.value.split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('http'));
    
    const total = new Set([...this.state.urls, ...textUrls]).size;
    this.elements.btnScrape.textContent = `Iniciar Busca (${total} URLs)`;
  }

  async handleSubmit(e) {
    e.preventDefault();
    if (this.state.isProcessing) return;

    // Cancela requisição anterior se houver
    if (this.state.abortController) this.state.abortController.abort();
    this.state.abortController = new AbortController();

    // Coleta URLs
    const textUrls = this.elements.urlInput.value.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
    const allUrls = [...new Set([...this.state.urls, ...textUrls])];

    if (allUrls.length === 0) return alert('Adicione URLs.');

    this.setLoading(true);

    try {
      const response = await fetch(`${CONFIG.API_URL}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: allUrls,
          palavrasChave: Array.from(this.state.keywords),
          negativosFortes: CONFIG.DEFAULTS.STRONG_NEG, // Implementar leitura do DOM se necessário
          negativosFracos: CONFIG.DEFAULTS.WEAK_NEG
        }),
        signal: this.state.abortController.signal
      });

      if (!response.ok) throw new Error('Erro na API');
      
      const data = await response.json();
      this.renderResults(data.data);

    } catch (error) {
      if (error.name !== 'AbortError') {
        alert('Erro ao buscar dados: ' + error.message);
      }
    } finally {
      this.setLoading(false);
    }
  }

  renderResults(data) {
    this.state.results = data;
    this.elements.resultsTableBody.innerHTML = '';
    
    if (data.length === 0) {
      this.elements.resultsContainer.classList.remove('hidden');
      return;
    }

    // OTIMIZAÇÃO: DocumentFragment evita reflow a cada linha inserida
    const fragment = document.createDocumentFragment();

    data.forEach(item => {
      const tr = document.createElement('tr');
      
      // Helper para criar célula segura (sem innerHTML)
      const createCell = (text, title = null) => {
        const td = document.createElement('td');
        td.textContent = text;
        if (title) td.title = title;
        return td;
      };

      tr.appendChild(createCell(item.Site, item.Site));
      tr.appendChild(createCell(item.Termos));
      tr.appendChild(createCell(item.Descricao, item.Descricao));
      
      const tdLink = document.createElement('td');
      const a = document.createElement('a');
      a.href = item.Link;
      a.textContent = 'Ver Link';
      a.target = '_blank';
      a.rel = 'noopener noreferrer'; // Segurança para target _blank
      tdLink.appendChild(a);
      tr.appendChild(tdLink);

      fragment.appendChild(tr);
    });

    this.elements.resultsTableBody.appendChild(fragment);
    this.elements.resultsContainer.classList.remove('hidden');
  }

  setLoading(loading) {
    this.state.isProcessing = loading;
    this.elements.btnScrape.disabled = loading;
    this.elements.btnScrape.textContent = loading ? 'Processando...' : 'Iniciar Busca';
    this.elements.progressContainer.classList.toggle('hidden', !loading);
  }

  downloadCSV() {
    if (!this.state.results.length) return;
    
    const csvContent = [
      ['Site', 'Termos', 'Descrição', 'Link'],
      ...this.state.results.map(r => [r.Site, r.Termos, r.Descricao, r.Link])
    ]
    .map(e => e.map(field => `"${String(field).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tratores-${Date.now()}.csv`;
    link.click();
  }
}

// Inicializa
document.addEventListener('DOMContentLoaded', () => new App());
