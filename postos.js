// ========================================
// SISTEMA DE AUDITORIA DE POSTOS - v2.0
// JavaScript Modular e Interativo
// ========================================

// Helpers globais
const $ = id => document.getElementById(id);
const storageKey = 'rondas_registros_v1';
const storageSummaryKey = 'rondas_summary_v1';

// ========================================
// SISTEMA DE NOTIFICAÇÕES TOAST
// ========================================
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', warning: '⚠' };
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || '✓'}</div>
    <div class="toast-message">${message}</div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========================================
// VALIDAÇÃO DE CAMPOS EM TEMPO REAL
// ========================================
function setupFieldValidation() {
  const requiredFields = document.querySelectorAll('input[required]');
  requiredFields.forEach(field => {
    field.addEventListener('blur', function() {
      if (!this.value.trim()) {
        this.style.borderColor = 'var(--danger)';
        this.style.background = '#fef2f2';
      } else {
        this.style.borderColor = 'var(--success)';
        this.style.background = '#f0fdf4';
      }
    });
    field.addEventListener('input', function() {
      if (this.value.trim()) {
        this.style.borderColor = 'var(--border)';
        this.style.background = '#fafbfc';
      }
    });
  });
}

// ========================================
// AUTO-SAVE (RASCUNHO)
// ========================================
function autoSaveForm() {
  const formData = {
    data: $('data')?.value || '',
    horaInicio: $('horaInicio')?.value || '',
    horaFim: $('horaFim')?.value || '',
    turno: $('turno')?.value || '',
    auditor: $('auditor')?.value || '',
    matricula: $('matricula')?.value || '',
    nomePosto: $('nomePosto')?.value || '',
    codigoPosto: $('codigoPosto')?.value || '',
    endereco: $('endereco')?.value || '',
    bairro: $('bairro')?.value || '',
    cidade: $('cidade')?.value || '',
    estado: $('estado')?.value || ''
  };
  localStorage.setItem('rondas_draft', JSON.stringify(formData));
}

function loadDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem('rondas_draft') || '{}');
    if (Object.keys(draft).length > 0) {
      Object.keys(draft).forEach(key => {
        if ($(key) && draft[key]) $(key).value = draft[key];
      });
      showToast('Rascunho recuperado!', 'success');
    }
  } catch(e) {
    console.error('Erro ao carregar rascunho:', e);
  }
}

function clearDraft() {
  localStorage.removeItem('rondas_draft');
}

// ========================================
// CONTADOR DE CARACTERES
// ========================================
function setupCharCounter(textareaId, maxChars = 500) {
  const textarea = $(textareaId);
  if (!textarea) return;
  
  const counter = document.createElement('div');
  counter.className = 'char-counter small';
  counter.style.textAlign = 'right';
  counter.style.marginTop = '4px';
  textarea.parentNode.appendChild(counter);
  
  function updateCounter() {
    const remaining = maxChars - textarea.value.length;
    counter.textContent = `${textarea.value.length}/${maxChars} caracteres`;
    counter.style.color = remaining < 50 ? 'var(--danger)' : 'var(--muted)';
    
    if (textarea.value.length > maxChars) {
      textarea.value = textarea.value.substring(0, maxChars);
    }
  }
  
  textarea.addEventListener('input', updateCounter);
  textarea.setAttribute('maxlength', maxChars);
  updateCounter();
}

// ========================================
// STORAGE - LEITURA E ESCRITA
// ========================================
function readStorage() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch {
    return [];
  }
}

function writeStorage(arr) {
  localStorage.setItem(storageKey, JSON.stringify(arr));
}

function readSummary() {
  try {
    return JSON.parse(localStorage.getItem(storageSummaryKey) || '{"labels":["Dia","Noite"],"counts":[0,0]}');
  } catch {
    return { labels: ["Dia", "Noite"], counts: [0, 0] };
  }
}

function writeSummary(obj) {
  localStorage.setItem(storageSummaryKey, JSON.stringify(obj));
}

function incrementSummaryForTurno(turno, delta) {
  const summary = readSummary();
  const index = summary.labels.indexOf(turno);
  if (index !== -1) {
    summary.counts[index] = Math.max(0, summary.counts[index] + delta);
    writeSummary(summary);
    updateChartFromSummary(summary);
  }
}

// ========================================
// CHECKLIST - ADICIONAR/REMOVER ITENS
// ========================================
const defaultChecklist = [
  { category: 'Efetivo do Posto (Avaliar pelo Programa de Gestão de Competências e Requisitos do Cliente)', item: 'Efetivo do Posto' },
  { category: 'Postura e Apresentação (Avaliar o Atendimento, Iniciativa, Comportamento e Condições de Uniforme)', item: 'Postura e Apresentação' },
  { category: 'Instruções Específicas (Avaliar o conhecimento, cumprimento dos procedimentos e necessidade de revisão)', item: 'Instruções Específicas' },
  { category: 'Livro de Ocorrências (Avaliar o preenchimento correto, assinaturas e acúmulo de livros de meses anteriores)', item: 'Livro de Ocorrências' },
  { category: 'Equipamentos do Posto (Avaliar as condições e quantidades de material/carga do posto)', item: 'Equipamentos do Posto' },
  { category: 'Armamento e Colete Balístico (Avaliar condições, quantidades, licenças e validades)', item: 'Armamento e Colete Balístico' },
  { category: 'Carteira Nacional de Vigilante - CNV (Avaliar o porte e validade das CNVs dos Vigilantes)', item: 'CNV dos Vigilantes' },
  { category: 'Condições do Posto (Avaliar manutenção predial e defeitos na segurança eletrônica)', item: 'Condições do Posto' },
  { category: 'Treinamento (Avaliar a eficácia do último treinamento obrigatório executado no posto)', item: 'Treinamento' }
];

function addChecklistRow(text = '', checklistName = '', statusValue) {
  const id = 'chk_' + Math.random().toString(36).slice(2, 8);
  const div = document.createElement('div');
  div.className = 'checkrow';
  div.style.animation = 'slideUp 0.3s ease-out';

  // Campo de categoria
  const selectCategory = document.createElement('select');
  selectCategory.name = 'checklistName_' + id;
  selectCategory.style.width = '150px';
  const categories = ['Segurança', 'Infraestrutura', 'Limpeza', 'Equipamentos', 'Documentação', 'Uniformes/EPIs', 'Outro'];
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (cat === checklistName) opt.selected = true;
    selectCategory.appendChild(opt);
  });

  // Campo de texto do item
  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'checklistItem_' + id;
  input.value = text;
  input.placeholder = 'Descreva o item de inspeção';
  input.style.flex = '1';

  // Campo de status (OK/Não OK/N/A)
  const statusControl = createStatusControl(id, statusValue);

  // Botão remover
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'remove-item danger';
  btn.title = 'Remover';
  btn.textContent = '✕';
  btn.addEventListener('click', () => {
    div.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => div.remove(), 300);
    showToast('Item removido', 'success');
  });

  div.appendChild(selectCategory);
  div.appendChild(input);
  div.appendChild(statusControl);
  div.appendChild(btn);
  $('checklist').appendChild(div);
  
  // Atualizar controles quando modo mudar
  div.setAttribute('data-status-id', id);
}

function createStatusControl(id, statusValue) {
  // Sempre usar campo de texto livre para respostas (aceita letras e números)
  const container = document.createElement('span');
  container.className = 'status-control';
  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'checklistStatus_' + id;
  input.placeholder = 'Resposta (texto ou número)';
  input.style.padding = '8px 10px';
  input.style.borderRadius = '6px';
  input.style.border = '1px solid var(--border)';
  input.style.minWidth = '120px';
  if (statusValue) input.value = statusValue;
  container.appendChild(input);
  return container;
}

function updateAllStatusControls() {
  const checkrows = document.querySelectorAll('.checkrow');
  checkrows.forEach(row => {
    const statusId = row.getAttribute('data-status-id');
    if (!statusId) return;

    const oldControl = row.querySelector('.status-control');
    if (!oldControl) return;

    // Capturar valor atual (qualquer input/select existente)
    let currentValue = '';
    const anyInput = oldControl.querySelector('input, select, textarea');
    if (anyInput) currentValue = anyInput.value || (anyInput.checked ? 'OK' : '');

    // Criar novo controle (texto livre)
    const newControl = createStatusControl(statusId, currentValue);
    oldControl.replaceWith(newControl);
  });
}

// ========================================
// PREVIEW DE FOTOS COM ZOOM
// ========================================
function setupPhotoPreview() {
  const photosInput = $('photos');
  if (!photosInput) return;

  photosInput.addEventListener('change', function() {
    const preview = $('photosPreview');
    preview.innerHTML = '';
    
    Array.from(this.files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.title = file.name;
        img.style.animation = `slideUp 0.3s ease-out ${idx * 0.1}s both`;
        
        // Zoom ao clicar
        img.addEventListener('click', function() {
          const modal = document.createElement('div');
          modal.className = 'photo-modal';
          modal.style = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer;animation:fadeIn 0.2s';
          
          const fullImg = document.createElement('img');
          fullImg.src = this.src;
          fullImg.style = 'max-width:90%;max-height:90%;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5)';
          
          modal.appendChild(fullImg);
          modal.addEventListener('click', () => {
            modal.style.animation = 'fadeOut 0.2s';
            setTimeout(() => modal.remove(), 200);
          });
          
          document.body.appendChild(modal);
        });
        
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
    
    if (this.files.length > 0) {
      showToast(`${this.files.length} foto(s) adicionada(s)`, 'success');
    }
  });
}

// ========================================
// FORMULÁRIO - SUBMIT E VALIDAÇÃO
// ========================================
function setupFormSubmit() {
  const form = $('rondaForm');
  if (!form) return;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const submitBtn = ev.target.querySelector('button[type=submit]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Salvando... <span class="spinner"></span>';

    try {
      // Capturar geolocalização (se permitido) antes de criar o registro
      const getCurrentLocation = () => new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        const opts = { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 };
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, ts: pos.timestamp }),
          err => resolve(null),
          opts
        );
      });

      let geo = await getCurrentLocation();

      // Função para validar se a coordenada está dentro do Espírito Santo (bounding box aproximado)
      function isWithinEspiritoSanto(lat, lng){
        // Bounding box aproximado para ES: SW: lat -21.5, lng -41.9 | NE: lat -18.0, lng -39.0
        if (typeof lat !== 'number' || typeof lng !== 'number') return false;
        const latMin = -21.5, latMax = -18.0, lngMin = -41.9, lngMax = -39.0;
        return lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
      }

      // Se a posição foi capturada mas está fora do Espírito Santo, descartar e avisar
      if (geo && !isWithinEspiritoSanto(geo.lat, geo.lng)){
        showToast('Localização detectada fora do Espírito Santo — coordenadas não serão salvas', 'warning');
        geo = null;
      }
      // Coletar dados do formulário
      const data = $('data').value;
      const horaInicio = $('horaInicio').value;
      const horaFim = $('horaFim').value;
      const turno = $('turno').value;
      const auditor = $('auditor').value.trim();
      const matricula = $('matricula').value.trim();
      const nomePosto = $('nomePosto').value.trim();
      const codigoPosto = $('codigoPosto').value.trim();
      const endereco = $('endereco').value.trim();
      const bairro = $('bairro').value.trim();
      const cidade = $('cidade').value.trim();
      const estado = $('estado').value;
      const responsavelPosto = $('responsavelPosto').value.trim();
      const contatoResponsavel = $('contatoResponsavel').value.trim();
      const supervisorArea = $('supervisorArea').value.trim();
      const quantidadeFuncionarios = $('quantidadeFuncionarios').value;
      const obs = $('obs').value.trim();

      // Coletar checklist
      const checklist = [];
      document.querySelectorAll('.checkrow').forEach(row => {
        const inputs = row.querySelectorAll('input[type=text], select');
        if (inputs.length >= 2) {
          const categorySelect = row.querySelector('select[name^="checklistName"]');
          const itemInput = row.querySelector('input[name^="checklistItem"]');
          const statusControl = row.querySelector('.status-control input, .status-control select');

          let status;
          if (statusControl.type === 'checkbox') {
            status = statusControl.checked ? 'OK' : 'Não OK';
          } else {
            status = statusControl.value;
          }

          if (itemInput && itemInput.value.trim()) {
            checklist.push({
              category: categorySelect ? categorySelect.value : '',
              item: itemInput.value.trim(),
              status: status
            });
          }
        }
      });

      // Coletar fotos
      const photos = [];
      const photosInputForSubmit = $('photos');
      if (photosInputForSubmit && photosInputForSubmit.files && photosInputForSubmit.files.length > 0) {
        for (let file of photosInputForSubmit.files) {
          const reader = new FileReader();
          const dataUrl = await new Promise((resolve) => {
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(file);
          });
          photos.push({ name: file.name, data: dataUrl });
        }
      }

      const registro = {
        id: Date.now(),
        data,
        horaInicio,
        horaFim,
        turno,
        auditor,
        matricula,
        posto: {
          nome: nomePosto,
          codigo: codigoPosto,
          endereco,
          bairro,
          cidade,
          estado,
          responsavel: responsavelPosto,
          contato: contatoResponsavel,
          supervisor: supervisorArea,
          quantidadeFuncionarios
        },
        obs,
        checklist,
        photos,
        checklistStyle: $('checklistStyle') ? $('checklistStyle').value : 'none'
      };

      // anexar geolocalização e supervisor (se disponível)
      if (geo) registro.geo = geo;
      if (supervisorArea) registro.supervisor = supervisorArea;

      // Salvar
      const arr = readStorage();
      arr.unshift(registro);
      writeStorage(arr);
      incrementSummaryForTurno(registro.turno, 1);

      // Tentar enviar ao servidor (não bloqueia)
      sendToServer(registro).catch(() => {});

      // Atualizar UI
      renderSavedList();
      
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      showToast('✓ Auditoria salva com sucesso!', 'success');

      // Limpar formulário
      form.reset();
      $('photosPreview').innerHTML = '';
      clearDraft();
      init();

    } catch (error) {
      console.error('Erro ao salvar:', error);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      showToast('Erro ao salvar registro', 'error');
    }
  });
}

// ========================================
// RENDERIZAR LISTA DE REGISTROS
// ========================================
function renderSavedList() {
  const list = readStorage();
  const el = $('savedList');
  if (!el) return;

  el.innerHTML = '';

  if (list.length === 0) {
    el.innerHTML = '<div class="small" style="text-align:center;padding:20px;color:var(--muted)">📋 Nenhum registro salvo</div>';
    return;
  }

  // Atualizar contador
  const countBadge = document.querySelector('.count-badge');
  if (countBadge) countBadge.textContent = list.length;

  list.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.style.animation = `slideUp 0.3s ease-out ${idx * 0.05}s both`;

    const left = document.createElement('div');
    const postoNome = item.posto?.nome || item.local || 'Sem identificação';
    
    const previewTitles = item.checklist?.slice(0, 3).map(c => c.item).join(', ') || '';
    left.innerHTML = `
      <div><strong>${item.data} — ${item.turno}</strong></div>
      <div class="small">${escapeHtml(item.auditor || '')} • ${escapeHtml(postoNome)}</div>
      ${previewTitles ? `<div class="small">${escapeHtml(previewTitles)}</div>` : ''}
    `;

    const right = document.createElement('div');
    right.className = 'item-actions';
    right.style = 'display:flex;gap:6px';

    const btnVer = document.createElement('button');
    btnVer.className = 'secondary';
    btnVer.textContent = 'Ver';
    btnVer.style.padding = '6px 12px';
    btnVer.style.fontSize = '0.85rem';
    btnVer.addEventListener('click', () => viewRegistro(item.id));

    const btnDel = document.createElement('button');
    btnDel.className = 'danger';
    btnDel.textContent = 'Excluir';
    btnDel.style.padding = '6px 12px';
    btnDel.style.fontSize = '0.85rem';
    btnDel.addEventListener('click', () => deleteRegistro(item.id));

    right.appendChild(btnVer);
    right.appendChild(btnDel);

    div.appendChild(left);
    div.appendChild(right);
    el.appendChild(div);
  });
}

// ========================================
// VISUALIZAR REGISTRO
// ========================================
function viewRegistro(id) {
  const arr = readStorage();
  const item = arr.find(i => i.id === id);
  if (!item) {
    showToast('Registro não encontrado', 'error');
    return;
  }

  const postoInfo = item.posto || {};
  const enderecoCompleto = [postoInfo.endereco, postoInfo.bairro, postoInfo.cidade, postoInfo.estado]
    .filter(Boolean)
    .join(', ');

  const style = `
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 20px auto; padding: 20px; }
    .form-wrap { background: white; padding: 30px; border-radius: 8px; }
    header { margin-bottom: 20px; border-bottom: 2px solid #0b63d1; padding-bottom: 10px; }
    header h1 { margin: 0; color: #0b63d1; font-size: 1.5rem; }
    .meta { color: #6b7280; font-size: 0.95rem; margin-top: 5px; }
    .section-title { background: #e6eefc; padding: 8px 12px; border-radius: 6px; margin: 20px 0 10px 0; font-weight: 600; color: #0b63d1; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .info-table td { padding: 10px; border: 1px solid #e6edf3; }
    .info-table strong { color: #0b63d1; display: block; margin-bottom: 5px; font-size: 0.9rem; }
    .checklist-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .checklist-table th, .checklist-table td { padding: 8px; border: 1px solid #ddd; text-align: left; font-size: 0.9rem; }
    .checklist-table th { background: #f4f6f8; font-weight: 600; }
    .status-ok { color: #10b981; font-weight: bold; }
    .status-nok { color: #e11d48; font-weight: bold; }
    .photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-top: 10px; }
    .photos img { width: 100%; height: 120px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; }
    @media print { .no-print { display: none; } }
  `;

  let checklistHtml = '';
  if (item.checklist && item.checklist.length > 0) {
    checklistHtml = '<div class="section-title">Checklist de Inspeção</div><table class="checklist-table"><thead><tr><th>Categoria</th><th>Item</th><th>Status</th></tr></thead><tbody>';
    item.checklist.forEach(c => {
      const statusClass = c.status === 'OK' ? 'status-ok' : (c.status === 'Não OK' ? 'status-nok' : '');
      checklistHtml += `<tr><td>${escapeHtml(c.category || '')}</td><td>${escapeHtml(c.item)}</td><td class="${statusClass}">${escapeHtml(c.status || 'N/A')}</td></tr>`;
    });
    checklistHtml += '</tbody></table>';
  }

  let photosHtml = '';
  if (item.photos && item.photos.length > 0) {
    photosHtml = '<div class="section-title">Fotos</div><div class="photos">';
    item.photos.forEach(p => {
      photosHtml += `<img src="${p.data}" alt="${escapeHtml(p.name)}" />`;
    });
    photosHtml += '</div>';
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Auditoria ${item.data}</title><style>${style}</style></head><body>` +
    `<div class="form-wrap">` +
    `<header><h1>Relatório de Auditoria de Posto</h1><div class="meta">${item.data} — ${item.turno} ${item.horaInicio ? '(' + item.horaInicio + (item.horaFim ? ' - ' + item.horaFim : '') + ')' : ''}</div></header>` +
    `<div class="section-title">Dados da Auditoria</div>` +
    `<table class="info-table"><tr><td><strong>Auditor</strong><div>${escapeHtml(item.auditor || '')}</div></td><td><strong>Matrícula</strong><div>${escapeHtml(item.matricula || 'N/A')}</div></td></tr></table>` +
    `<div class="section-title">Dados do Posto</div>` +
    `<table class="info-table">` +
    `<tr><td><strong>Nome do Posto</strong><div>${escapeHtml(postoInfo.nome || item.local || '')}</div></td><td><strong>Código</strong><div>${escapeHtml(postoInfo.codigo || 'N/A')}</div></td></tr>` +
    `<tr><td colspan="2"><strong>Endereço</strong><div>${escapeHtml(enderecoCompleto || 'N/A')}</div></td></tr>` +
    `<tr><td><strong>Responsável do Posto</strong><div>${escapeHtml(postoInfo.responsavel || 'N/A')}</div></td><td><strong>Contato</strong><div>${escapeHtml(postoInfo.contato || 'N/A')}</div></td></tr>` +
    `<tr><td><strong>Supervisor</strong><div>${escapeHtml(postoInfo.supervisor || 'N/A')}</div></td><td><strong>Qtd. Funcionários</strong><div>${escapeHtml(postoInfo.quantidadeFuncionarios || 'N/A')}</div></td></tr>` +
    `</table>` +
    checklistHtml +
    (item.obs ? `<div class="section-title">Observações</div><p>${escapeHtml(item.obs)}</p>` : '') +
    photosHtml +
    `<div class="no-print" style="margin-top:30px;text-align:center"><button onclick="window.print()" style="padding:10px 20px;background:#0b63d1;color:white;border:none;border-radius:6px;cursor:pointer;font-size:1rem">Imprimir</button></div>` +
    `</div></body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

// ========================================
// DELETAR REGISTRO
// ========================================
function deleteRegistro(id) {
  if (!confirm('⚠️ Tem certeza que deseja excluir este registro?')) return;

  let arr = readStorage();
  const found = arr.find(i => i.id === id);
  arr = arr.filter(i => i.id !== id);
  writeStorage(arr);
  
  if (found) incrementSummaryForTurno(found.turno, -1);
  
  renderSavedList();
  showToast('Registro excluído', 'success');
}

// ========================================
// EXPORTAR DADOS (PDF)
// Funções robustas para gerar PDF usando jsPDF. Essas funções tentam localizar
// o construtor do jsPDF em várias formas (UMD / window.jsPDF) e exibem mensagens
// de erro claras no console/alert quando algo falha.
function resolveJsPdfCtor() {
  if (window.jspdf && (window.jspdf.jsPDF || window.jspdf.default)) return window.jspdf.jsPDF || window.jspdf.default;
  if (window.jsPDF) return window.jsPDF;
  if (typeof window.jspdf === 'function') return window.jspdf;
  return null;
}

function exportAllPdf() {
  console.log('exportAllPdf called');
  const registros = readStorage();
  if (!registros || registros.length === 0) { if (window.showToast) showToast('Nenhum registro para exportar', 'warning'); else alert('Nenhum registro para exportar'); return; }
  const DocCtor = resolveJsPdfCtor();
  if (!DocCtor) { alert('Biblioteca jsPDF não encontrada. Recarregue a página.'); return; }
  try {
    const doc = new DocCtor({ unit: 'pt', format: 'A4' });
    const margin = 40;
    const lineHeight = 12;
    let y = margin;
    doc.setFontSize(14);
    doc.text('Registros Salvos', margin, y);
    doc.setFontSize(10);
    y += 24;
    registros.forEach((r, idx) => {
      const posto = (r.posto && r.posto.nome) ? r.posto.nome : (r.local || 'Sem identificação');
      const auditor = r.auditor || '';
      const text = `${idx + 1}. ${r.data} ${r.turno ? '- ' + r.turno : ''} — ${auditor} — ${posto}`;
      const split = doc.splitTextToSize(text, doc.internal.pageSize.width - margin * 2);
      doc.text(split, margin, y);
      y += (split.length * lineHeight) + 6;
      if (y > doc.internal.pageSize.height - margin) { doc.addPage(); y = margin; }
    });
    doc.save('registros.pdf');
    if (window.showToast) showToast('Exportado registros (PDF)', 'success');
  } catch (err) {
    console.error('Erro exportAllPdf:', err);
    alert('Erro ao gerar PDF. Veja o console do navegador para detalhes.');
  }
}

function exportRegistroPdf(r) {
  if (!r) return;
  const DocCtor = resolveJsPdfCtor();
  if (!DocCtor) { alert('Biblioteca jsPDF não encontrada. Recarregue a página.'); return; }
  try {
    const doc = new DocCtor({ unit: 'pt', format: 'A4' });
    const margin = 40;
    let y = margin;
    doc.setFontSize(14);
    doc.text('Relatório de Auditoria', margin, y);
    doc.setFontSize(11);
    y += 20;
    doc.text(`Data: ${r.data || ''}    Turno: ${r.turno || ''}`, margin, y);
    y += 16;
    doc.text(`Auditor: ${r.auditor || ''}`, margin, y);
    y += 16;
    const posto = r.posto && r.posto.nome ? r.posto.nome : '';
    doc.text(`Posto: ${posto}`, margin, y);
    y += 18;
    if (r.obs) {
      const obsLines = doc.splitTextToSize(`Observações: ${r.obs}`, doc.internal.pageSize.width - margin * 2);
      doc.text(obsLines, margin, y);
      y += obsLines.length * 12 + 6;
    }
    if (r.checklist && r.checklist.length > 0) {
      doc.setFontSize(12);
      doc.text('Checklist:', margin, y);
      y += 14;
      doc.setFontSize(10);
      r.checklist.forEach((c, i) => {
        const line = `${i+1}. ${c.item || c.text || ''} — ${c.status || ''}`;
        const parts = doc.splitTextToSize(line, doc.internal.pageSize.width - margin * 2);
        doc.text(parts, margin, y);
        y += parts.length * 12 + 4;
        if (y > doc.internal.pageSize.height - margin) { doc.addPage(); y = margin; }
      });
    }
    doc.save(`ronda-${r.id || Date.now()}.pdf`);
    if (window.showToast) showToast('Exportado registro (PDF)', 'success');
  } catch (err) {
    console.error('Erro exportRegistroPdf:', err);
    alert('Erro ao gerar PDF do registro. Veja o console do navegador para detalhes.');
  }
}

function exportLocationsPdf() {
  const registros = readStorage();
  const ES_MIN_LAT = -21.5, ES_MAX_LAT = -18.0, ES_MIN_LNG = -41.9, ES_MAX_LNG = -39.0;
  const filtered = registros.filter(r => r.geo && typeof r.geo.lat === 'number' && typeof r.geo.lng === 'number' && r.geo.lat >= ES_MIN_LAT && r.geo.lat <= ES_MAX_LAT && r.geo.lng >= ES_MIN_LNG && r.geo.lng <= ES_MAX_LNG);
  if (!filtered || filtered.length === 0) { if (window.showToast) showToast('Nenhum registro com localização no Espírito Santo para exportar', 'warning'); else alert('Nenhum registro com localização no Espírito Santo para exportar'); return; }
  const DocCtor = resolveJsPdfCtor();
  if (!DocCtor) { alert('Biblioteca jsPDF não encontrada. Recarregue a página.'); return; }
  try {
    const doc = new DocCtor({ unit: 'pt', format: 'A4' });
    const margin = 40; let y = margin;
    doc.setFontSize(14); doc.text('Localizações - Auditorias (Espírito Santo)', margin, y); y += 20;
    doc.setFontSize(10);
    filtered.forEach((r, idx) => {
      const posto = (r.posto && r.posto.nome) ? r.posto.nome : (r.local || 'Sem identificação');
      const when = `${r.data || ''} ${r.horaInicio || ''}`.trim();
      const lat = r.geo.lat, lng = r.geo.lng;
      const line = `${idx + 1}. ${when} — ${r.turno || ''} — ${r.auditor || ''} — ${posto} — lat: ${lat.toFixed(6)}, lng: ${lng.toFixed(6)}`;
      const parts = doc.splitTextToSize(line, doc.internal.pageSize.width - margin * 2);
      doc.text(parts, margin, y);
      y += parts.length * 12 + 6;
      if (y > doc.internal.pageSize.height - margin) { doc.addPage(); y = margin; }
    });
    doc.save('auditorias-localizacoes.pdf');
    if (window.showToast) showToast('Exportado localizações (PDF)', 'success');
  } catch (err) {
    console.error('Erro exportLocationsPdf:', err);
    alert('Erro ao gerar PDF de localizações. Veja o console do navegador para detalhes.');
  }
}

function exportRankingPdf() {
  const registros = readStorage();
  const counts = {};
  registros.forEach(r => {
    const posto = (r.posto && r.posto.nome) ? r.posto.nome : (r.postoName || 'Sem identificação');
    counts[posto] = (counts[posto] || 0) + 1;
  });
  const arr = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  if (!arr || arr.length === 0) { if (window.showToast) showToast('Nenhum registro para gerar ranking', 'warning'); else alert('Nenhum registro para gerar ranking'); return; }
  const DocCtor = resolveJsPdfCtor();
  if (!DocCtor) { alert('Biblioteca jsPDF não encontrada. Recarregue a página.'); return; }
  try {
    const doc = new DocCtor({ unit: 'pt', format: 'A4' });
    const margin = 40; let y = margin;
    doc.setFontSize(14); doc.text('Ranking de Ocorrências por Posto', margin, y); y += 20;
    doc.setFontSize(11);
    arr.forEach((it, idx) => {
      const line = `${idx + 1}. ${it.name} — ${it.count} ocorrência(s)`;
      const parts = doc.splitTextToSize(line, doc.internal.pageSize.width - margin * 2);
      doc.text(parts, margin, y);
      y += parts.length * 12 + 6;
      if (y > doc.internal.pageSize.height - margin) { doc.addPage(); y = margin; }
    });
    doc.save('ranking-postos.pdf');
    if (window.showToast) showToast('Exportado ranking (PDF)', 'success');
  } catch (err) {
    console.error('Erro exportRankingPdf:', err);
    alert('Erro ao gerar PDF do ranking. Veja o console do navegador para detalhes.');
  }
}

// Expor funções para o escopo global para chamadas inline/onclick
try { window.exportAllPdf = exportAllPdf; window.exportRegistroPdf = exportRegistroPdf; window.exportLocationsPdf = exportLocationsPdf; window.exportRankingPdf = exportRankingPdf; } catch(e) { /* ambiente restrito */ }
function renderSavedList(list) {
  // aceita lista opcional (filtrada); se não fornecida, lê do storage
  const data = Array.isArray(list) ? list : readStorage();
  const el = $('savedList');
  if (!el) return;

  el.innerHTML = '';

  if (data.length === 0) {
    el.innerHTML = '<div class="small" style="text-align:center;padding:20px;color:var(--muted)">📋 Nenhum registro salvo</div>';
    // atualizar badge
    const countBadgeEmpty = document.querySelector('.count-badge');
    if (countBadgeEmpty) countBadgeEmpty.textContent = '0';
    return;
  }

  // Atualizar contador
  const countBadge = document.querySelector('.count-badge');
  if (countBadge) countBadge.textContent = data.length;

  data.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.style.animation = `slideUp 0.32s cubic-bezier(.2,.9,.2,1) ${idx * 0.04}s both`;

    const left = document.createElement('div');
    const postoNome = item.posto?.nome || item.local || 'Sem identificação';
    const previewTitles = (item.checklist || []).slice(0, 3).map(c => (c.item || c.text || '')).filter(Boolean).join(' • ') || '';
    left.innerHTML = `
      <div><strong>${escapeHtml(item.data || '')} — ${escapeHtml(item.turno || '')}</strong></div>
      <div class="small">${escapeHtml(item.auditor || '')} • ${escapeHtml(postoNome)}</div>
      ${previewTitles ? `<div class="small">${escapeHtml(previewTitles)}</div>` : ''}
    `;

    const right = document.createElement('div');
    right.className = 'item-actions';
    right.style.display = 'flex';
    right.style.gap = '6px';

    const btnVer = document.createElement('button');
    btnVer.className = 'secondary';
    btnVer.textContent = 'Ver';
    btnVer.style.padding = '6px 12px';
    btnVer.style.fontSize = '0.85rem';
    btnVer.addEventListener('click', (ev) => { ev.stopPropagation(); viewRegistro(item.id); });

    const btnExport = document.createElement('button');
    btnExport.className = 'secondary';
    btnExport.textContent = 'Exportar';
    btnExport.style.padding = '6px 10px';
    btnExport.style.fontSize = '0.85rem';
    btnExport.addEventListener('click', (ev) => { ev.stopPropagation(); exportRegistroPdf(item); showToast('Exportado registro (PDF)', 'success'); });

    const btnDel = document.createElement('button');
    btnDel.className = 'danger';
    btnDel.textContent = 'Excluir';
    btnDel.style.padding = '6px 12px';
    btnDel.style.fontSize = '0.85rem';
    btnDel.addEventListener('click', (ev) => { ev.stopPropagation(); if (confirm('⚠️ Excluir este registro?')) deleteRegistro(item.id); });

    right.appendChild(btnVer);
    right.appendChild(btnExport);
    right.appendChild(btnDel);

    // clique no item também abre visualização
    div.addEventListener('click', () => viewRegistro(item.id));

    div.appendChild(left);
    div.appendChild(right);
    el.appendChild(div);
  });
}
// ========================================
// GRÁFICO DE TURNOS
// ========================================
let chartInstance = null;

function updateChartFromSummary(summary) {
  const canvas = $('turnosChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (chartInstance) {
    chartInstance.data.labels = summary.labels;
    chartInstance.data.datasets[0].data = summary.counts;
    chartInstance.update();
  } else {
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: summary.labels,
        datasets: [{
          label: 'Auditorias por Turno',
          data: summary.counts,
          backgroundColor: ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa'],
          borderColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

// ========================================
// ENVIAR PARA SERVIDOR (SIMULADO)
// ========================================
async function sendToServer(registro) {
  // Implementar integração com servidor quando disponível
  return Promise.resolve();
}

// ========================================
// UTILITÁRIOS
// ========================================
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ========================================
// INICIALIZAÇÃO
// ========================================
function init() {
  const today = new Date().toISOString().split('T')[0];
  if ($('data') && !$('data').value) {
    $('data').value = today;
  }

  // Popular checklist padrão se estiver vazio
  const checklistEl = $('checklist');
  if (checklistEl && checklistEl.children.length === 0) {
    defaultChecklist.forEach(item => addChecklistRow(item.item, item.category));
  }

  // Migrar turnos antigos para o novo esquema (Dia / Noite)
  migrateOldTurnosIfNeeded();

  // Atualizar gráfico
  const summary = readSummary();
  updateChartFromSummary(summary);

  // Renderizar lista
  renderSavedList();
}

// Migrar registros antigos que usavam Manhã/Tarde/Noite/Madrugada
function migrateOldTurnosIfNeeded(){
  const arr = readStorage();
  if(!Array.isArray(arr) || arr.length===0) return;
  let changed = false;
  arr.forEach(r=>{
    if(!r.turno) return;
    const t = String(r.turno).toLowerCase();
    if(t === 'manhã' || t === 'manha' || t === 'tarde'){
      if(r.turno !== 'Dia'){ r.turno = 'Dia'; changed = true; }
    } else if(t === 'noite' || t === 'madrugada'){
      if(r.turno !== 'Noite'){ r.turno = 'Noite'; changed = true; }
    }
  });
  if(changed){ writeStorage(arr); showToast('Registros antigos migrados para turnos Dia/Noite', 'success'); }
}

// ========================================
// EVENTOS E LISTENERS
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar
  init();
  setupFieldValidation();
  setupCharCounter('obs', 500);
  setupPhotoPreview();
  setupFormSubmit();
  loadDraft();

  // Botão adicionar item checklist
  $('addItem')?.addEventListener('click', () => {
    const val = $('newItem')?.value.trim();
    if (!val) return showToast('Digite o texto do item', 'warning');
    addChecklistRow(val);
    $('newItem').value = '';
    showToast('Item adicionado!', 'success');
  });

  // Modo de resposta do checklist
  $('responseMode')?.addEventListener('change', () => {
    updateAllStatusControls();
  });

  // Botões de ação
  // O botão de exportação agora gera PDF com todos os registros
  $('exportPdf')?.addEventListener('click', () => exportAllPdf());
  $('exportPdfButton')?.addEventListener('click', () => exportAllPdf());
  $('exportCsv')?.addEventListener('click', () => exportAllCsv());
  $('print')?.addEventListener('click', () => {
    showToast('Preparando impressão...', 'success');
    setTimeout(() => window.print(), 300);
  });

  $('clearForm')?.addEventListener('click', () => {
    if (confirm('Limpar formulário?')) {
      $('rondaForm').reset();
      $('photosPreview').innerHTML = '';
      clearDraft();
      init();
      showToast('Formulário limpo', 'success');
    }
  });

  $('clearAll')?.addEventListener('click', () => {
    if (confirm('⚠️ Excluir TODOS os registros? Esta ação não pode ser desfeita!')) {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(storageSummaryKey);
      renderSavedList();
      const empty = { labels: ['Dia', 'Noite'], counts: [0, 0] };
      writeSummary(empty);
      updateChartFromSummary(empty);
      showToast('Todos os registros foram excluídos', 'success');
    }
  });

  // Auto-save a cada 30 segundos
  setInterval(() => {
    const formElements = document.querySelectorAll('#rondaForm input, #rondaForm select, #rondaForm textarea');
    let hasContent = false;
    formElements.forEach(el => {
      if (el.value) hasContent = true;
    });
    if (hasContent) autoSaveForm();
  }, 30000);

  // Mensagem de boas-vindas
  setTimeout(() => {
    const list = readStorage();
    if (list.length > 0) {
      showToast(`📊 ${list.length} registro(s) carregado(s)`, 'success');
    }
  }, 500);

  // Pesquisa rápida nos registros salvos (debounce)
  const savedSearch = $('savedSearch');
  if (savedSearch) {
    let searchTimer = null;
    savedSearch.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      const q = e.target.value.trim().toLowerCase();
      searchTimer = setTimeout(() => {
        const all = readStorage();
        if (!q) return renderSavedList(all);
        const filtered = all.filter(r => {
          if (!r) return false;
          const parts = [r.auditor || '', r.posto?.nome || '', r.posto?.codigo || '', r.posto?.cidade || '', r.data || '', r.supervisor || ''];
          return parts.join(' ').toLowerCase().includes(q);
        });
        renderSavedList(filtered);
      }, 160);
    });
  }
});
