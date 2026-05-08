const STORAGE_KEY = 'pedidos_produtos_innolife_v4';
const HIST_KEY = 'pedidos_produtos_innolife_historico_v2';
const PROD_KEY = 'pedidos_produtos_innolife_produtos_v2';

const SUPABASE_URL = 'https://joaeftlwrseqmwijvqii.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2qwk-Z5LXdz_ebi2Cp7MKQ_EUQ5idXS';
const TABLE = 'pedidos_produtos';
const ARCHIVE_TABLE = 'listas_pedidos_mensais';
const PRODUCTS_TABLE = 'produtos_pedidos';

let pedidos = [];
let historico = [];
let produtos = ['Melasonina', 'Bom Hálito', 'Pulmoclean', 'DrySkin'];
let usandoNuvem = true;

const $ = (id) => document.getElementById(id);
const api = `${SUPABASE_URL}/rest/v1/${TABLE}`;
const archiveApi = `${SUPABASE_URL}/rest/v1/${ARCHIVE_TABLE}`;
const productsApi = `${SUPABASE_URL}/rest/v1/${PRODUCTS_TABLE}`;

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...extra
  };
}

function saveLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify(pedidos)); }
function saveHistLocal() { localStorage.setItem(HIST_KEY, JSON.stringify(historico)); }
function saveProductsLocal() { localStorage.setItem(PROD_KEY, JSON.stringify(produtos)); }

function loadLocal() {
  pedidos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  historico = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
  const savedProducts = JSON.parse(localStorage.getItem(PROD_KEY) || '[]');
  if (savedProducts.length) produtos = savedProducts;
}

function normalize(row) {
  return {
    id: row.id,
    funcionario: row.funcionario || '',
    produto: row.produto || '',
    quantidade: Number(row.quantidade || 0),
    checked: Boolean(row.checked),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    arquivado: Boolean(row.arquivado)
  };
}

function normalizeArchive(row) {
  return {
    id: row.id,
    mes: row.mes_referencia || row.mes || '',
    observacao: row.observacao || '',
    totalPedidos: Number(row.total_pedidos || row.totalPedidos || 0),
    totalItens: Number(row.total_itens || row.totalItens || 0),
    pedidos: row.pedidos_json || row.pedidos || [],
    createdAt: row.created_at || row.createdAt || new Date().toISOString()
  };
}

function normalizeProduct(row) { return row.nome || row.produto || row.name || ''; }
function setStatus(text) { if ($('statusConexao')) $('statusConexao').textContent = text; }
function currentMonth() { return new Date().toISOString().slice(0, 7); }
function fmtDate(iso) { try { return new Date(iso).toLocaleString('pt-BR'); } catch { return ''; } }
function escapeHtml(str) { return String(str).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

async function carregarPedidos() {
  try {
    setStatus('Conectando na nuvem...');
    const res = await fetch(`${api}?select=*&arquivado=eq.false&order=created_at.desc`, { headers: headers() });
    if (!res.ok) throw new Error(await res.text());
    pedidos = (await res.json()).map(normalize);
    usandoNuvem = true;
    saveLocal();
    setStatus('Online • Supabase');
    await carregarProdutos();
    await carregarHistorico();
  } catch (err) {
    console.warn(err);
    usandoNuvem = false;
    loadLocal();
    setStatus('Modo local • verifique o supabase.sql');
  }
  renderAll();
}

async function carregarHistorico() {
  if (!usandoNuvem) { loadLocal(); renderHistorico(); return; }
  try {
    const res = await fetch(`${archiveApi}?select=*&order=created_at.desc`, { headers: headers() });
    if (!res.ok) throw new Error(await res.text());
    historico = (await res.json()).map(normalizeArchive);
    saveHistLocal();
  } catch (err) {
    console.warn(err);
    historico = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
  }
  renderHistorico();
}

async function carregarProdutos() {
  const localProdutos = JSON.parse(localStorage.getItem(PROD_KEY) || '[]');
  if (localProdutos.length) produtos = localProdutos;
  if (!usandoNuvem) { renderProdutos(); return; }
  try {
    const res = await fetch(`${productsApi}?select=*&order=nome.asc`, { headers: headers() });
    if (!res.ok) throw new Error(await res.text());
    const remote = (await res.json()).map(normalizeProduct).filter(Boolean);
    if (remote.length) produtos = [...new Set(remote)];
    saveProductsLocal();
  } catch (err) {
    console.warn('Produtos em modo local:', err);
  }
  renderProdutos();
}

async function criarPedido(payload) {
  if (!usandoNuvem) {
    pedidos.unshift({ id: crypto.randomUUID(), ...payload, checked: false, arquivado: false, createdAt: new Date().toISOString() });
    saveLocal();
    return;
  }
  const res = await fetch(api, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ funcionario: payload.funcionario, produto: payload.produto, quantidade: payload.quantidade, checked: false, arquivado: false })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  pedidos.unshift(normalize(data[0]));
  saveLocal();
}

async function atualizarPedido(id, patch) {
  if (!usandoNuvem) {
    pedidos = pedidos.map(p => p.id === id ? { ...p, ...patch } : p);
    saveLocal();
    return;
  }
  const res = await fetch(`${api}?id=eq.${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(patch) });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  pedidos = pedidos.map(p => p.id === id ? normalize(data[0]) : p);
  saveLocal();
}

async function removerPedido(id) {
  if (!usandoNuvem) {
    pedidos = pedidos.filter(p => p.id !== id);
    saveLocal();
    return;
  }
  const res = await fetch(`${api}?id=eq.${id}`, { method: 'DELETE', headers: headers() });
  if (!res.ok) throw new Error(await res.text());
  pedidos = pedidos.filter(p => p.id !== id);
  saveLocal();
}

async function limparPedidos() {
  if (!usandoNuvem) { pedidos = []; saveLocal(); return; }
  const res = await fetch(`${api}?arquivado=eq.false`, { method: 'DELETE', headers: headers() });
  if (!res.ok) throw new Error(await res.text());
  pedidos = [];
  saveLocal();
}

async function salvarProduto(nome) {
  nome = nome.trim();
  if (!nome) return;
  if (produtos.some(p => p.toLowerCase() === nome.toLowerCase())) { toast('Esse produto já está cadastrado.'); return; }
  produtos.push(nome);
  produtos.sort((a, b) => a.localeCompare(b));
  saveProductsLocal();
  renderProdutos();
  if (usandoNuvem) {
    try {
      const res = await fetch(productsApi, { method: 'POST', headers: headers(), body: JSON.stringify({ nome }) });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      console.warn(err);
      toast('Produto salvo localmente. Rode o supabase.sql para salvar na nuvem.');
    }
  }
}

async function excluirProduto(nome) {
  if (!confirm(`Excluir o produto "${nome}" das opções?`)) return;
  produtos = produtos.filter(p => p !== nome);
  saveProductsLocal();
  renderProdutos();
  if (usandoNuvem) {
    try { await fetch(`${productsApi}?nome=eq.${encodeURIComponent(nome)}`, { method: 'DELETE', headers: headers() }); } catch (err) { console.warn(err); }
  }
}

async function salvarListaMes() {
  if (!pedidos.length) { toast('Não existe pedido para salvar.'); return; }
  const mes = $('mesReferencia').value || currentMonth();
  const observacao = $('obsMes').value.trim() || 'Lista mensal atendida';
  const totalPedidos = pedidos.length;
  const totalItens = pedidos.reduce((s, p) => s + Number(p.quantidade), 0);
  const snapshot = pedidos.map(p => ({ funcionario: p.funcionario, produto: p.produto, quantidade: p.quantidade, checked: p.checked, data: p.createdAt }));
  if (!confirm(`Salvar a lista de ${mes} como atendida e limpar a lista atual?`)) return;

  if (!usandoNuvem) {
    historico.unshift({ id: crypto.randomUUID(), mes, observacao, totalPedidos, totalItens, pedidos: snapshot, createdAt: new Date().toISOString() });
    pedidos = [];
    saveLocal();
    saveHistLocal();
    renderAll();
    toast('Lista do mês salva.');
    return;
  }

  const ins = await fetch(archiveApi, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ mes_referencia: mes, observacao, total_pedidos: totalPedidos, total_itens: totalItens, pedidos_json: snapshot })
  });
  if (!ins.ok) throw new Error(await ins.text());

  for (const id of pedidos.map(p => p.id)) {
    await fetch(`${api}?id=eq.${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ arquivado: true, checked: true }) });
  }
  pedidos = [];
  saveLocal();
  await carregarHistorico();
  renderAll();
  toast('Lista do mês salva e lista atual limpa.');
}

function renderAll() { render(); renderProdutos(); renderHistorico(); }

function render() {
  const lista = $('listaPedidos');
  if (!lista) return;
  const busca = ($('busca')?.value || '').toLowerCase();
  lista.innerHTML = '';
  const filtrados = pedidos.filter(p => p.funcionario.toLowerCase().includes(busca) || p.produto.toLowerCase().includes(busca));

  if (!filtrados.length) {
    lista.appendChild($('emptyTemplate').content.cloneNode(true));
  } else {
    filtrados.forEach(p => {
      const tr = document.createElement('tr');
      if (p.checked) tr.classList.add('checked');
      tr.innerHTML = `<td><input class="check" type="checkbox" ${p.checked ? 'checked' : ''} data-check-id="${p.id}"></td><td><strong>${escapeHtml(p.funcionario)}</strong></td><td>${escapeHtml(p.produto)}</td><td><strong>${p.quantidade}</strong></td><td>${fmtDate(p.createdAt)}</td><td><button type="button" class="mini" data-edit-id="${p.id}">Editar</button><button type="button" class="mini delete" data-delete-id="${p.id}">Excluir</button></td>`;
      lista.appendChild(tr);
    });
  }

  if ($('totalPedidos')) $('totalPedidos').textContent = pedidos.length;
  if ($('totalItens')) $('totalItens').textContent = pedidos.reduce((s, p) => s + Number(p.quantidade), 0);
  if ($('totalCheck')) $('totalCheck').textContent = pedidos.filter(p => p.checked).length;
  if ($('previewMes')) $('previewMes').textContent = `Lista atual: ${pedidos.length} pedidos • ${pedidos.reduce((s, p) => s + Number(p.quantidade), 0)} itens • ${pedidos.filter(p => p.checked).length} conferidos.`;
  renderResumo();
}

function renderResumo() {
  const box = $('resumoProdutos');
  if (!box) return;
  box.innerHTML = '';
  if (!pedidos.length) { box.innerHTML = '<p class="empty">Nenhum produto para consolidar.</p>'; return; }

  const grupos = {};
  pedidos.forEach(p => {
    const key = p.produto.trim();
    if (!grupos[key]) grupos[key] = { total: 0, pessoas: [] };
    grupos[key].total += Number(p.quantidade);
    grupos[key].pessoas.push(`${p.funcionario}: ${p.quantidade}${p.checked ? ' ✓' : ''}`);
  });

  Object.entries(grupos).sort((a, b) => a[0].localeCompare(b[0])).forEach(([produto, info]) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h4>${escapeHtml(produto)}</h4><div class="qty">${info.total}</div><small>Total solicitado</small><ul>${info.pessoas.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
    box.appendChild(card);
  });
}

function renderProdutos() {
  const dataList = $('produtosSugestoes');
  if (dataList) dataList.innerHTML = produtos.map(p => `<option value="${escapeHtml(p)}"></option>`).join('');

  const box = $('listaProdutos');
  if (!box) return;
  box.innerHTML = '';
  if (!produtos.length) { box.innerHTML = '<p class="empty">Nenhum produto cadastrado.</p>'; return; }

  produtos.forEach(produto => {
    const div = document.createElement('div');
    div.className = 'product-chip';
    div.innerHTML = `<span>${escapeHtml(produto)}</span><button type="button" data-remove-product="${escapeHtml(produto)}">Excluir</button>`;
    box.appendChild(div);
  });
}

function renderHistorico() {
  const box = $('historicoListas');
  if (!box) return;
  box.innerHTML = '';
  if (!historico.length) { box.innerHTML = '<p class="empty">Nenhuma lista mensal salva ainda.</p>'; return; }

  historico.forEach(h => {
    const div = document.createElement('div');
    div.className = 'history-card';
    const resumo = {};
    (h.pedidos || []).forEach(p => { resumo[p.produto] = (resumo[p.produto] || 0) + Number(p.quantidade); });
    div.innerHTML = `<h4>Lista ${escapeHtml(h.mes)}</h4><div class="meta">Salva em ${fmtDate(h.createdAt)} • ${h.totalPedidos} pedidos • ${h.totalItens} itens</div><p>${escapeHtml(h.observacao)}</p><details><summary>Ver produtos e funcionários</summary><ul>${Object.entries(resumo).map(([prod, q]) => `<li><strong>${escapeHtml(prod)}</strong>: ${q}</li>`).join('')}</ul><hr><ul>${(h.pedidos || []).map(p => `<li>${escapeHtml(p.funcionario)} — ${escapeHtml(p.produto)} — ${p.quantidade}</li>`).join('')}</ul></details>`;
    box.appendChild(div);
  });
}

async function toggleCheck(id) {
  const p = pedidos.find(x => x.id === id);
  if (!p) return;
  try { await atualizarPedido(id, { checked: !p.checked }); render(); } catch (e) { console.error(e); toast('Erro ao atualizar check.'); }
}

async function excluirPedido(id) {
  if (!confirm('Deseja excluir este pedido?')) return;
  try { await removerPedido(id); render(); toast('Pedido excluído.'); } catch (e) { console.error(e); toast('Erro ao excluir pedido.'); }
}

async function editarPedido(id) {
  const p = pedidos.find(x => x.id === id);
  if (!p) return;
  const funcionario = prompt('Funcionário:', p.funcionario);
  if (funcionario === null) return;
  const produto = prompt('Produto:', p.produto);
  if (produto === null) return;
  const quantidade = prompt('Quantidade:', p.quantidade);
  if (quantidade === null) return;
  const qtd = Number(quantidade);
  if (!funcionario.trim() || !produto.trim() || !qtd || qtd < 1) { alert('Preencha os dados corretamente.'); return; }
  try { await atualizarPedido(id, { funcionario: funcionario.trim(), produto: produto.trim(), quantidade: qtd }); render(); toast('Pedido atualizado.'); } catch (e) { console.error(e); toast('Erro ao editar pedido.'); }
}

function openTab(tabName, btn) {
  document.querySelectorAll('.nav[data-tab]').forEach(b => b.classList.remove('active'));
  if (btn?.dataset?.tab) btn.classList.add('active');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('show'));
  const target = $(`tab-${tabName}`);
  if (target) target.classList.add('show');
}

function initEvents() {
  if ($('mesReferencia')) $('mesReferencia').value = currentMonth();

  document.querySelectorAll('.nav[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => openTab(btn.dataset.tab, btn));
  });

  $('imprimirPdf')?.addEventListener('click', () => window.print());
  $('recarregar')?.addEventListener('click', carregarPedidos);

  $('pedidoForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const funcionario = $('funcionario').value.trim();
    const produto = $('produto').value.trim();
    const quantidade = Number($('quantidade').value);
    if (!funcionario || !produto || quantidade < 1) return;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Salvando...';
    try {
      await criarPedido({ funcionario, produto, quantidade });
      if (!produtos.some(p => p.toLowerCase() === produto.toLowerCase())) {
        produtos.push(produto);
        produtos.sort((a, b) => a.localeCompare(b));
        saveProductsLocal();
        renderProdutos();
      }
      render();
      e.target.reset();
      $('quantidade').value = 1;
      $('funcionario').focus();
      toast('Pedido adicionado.');
    } catch (err) {
      console.error(err);
      toast('Erro ao salvar. Rode o supabase.sql atualizado.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Adicionar pedido';
    }
  });

  $('produtoForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('novoProduto');
    await salvarProduto(input.value);
    input.value = '';
    input.focus();
  });

  $('busca')?.addEventListener('input', render);
  $('limparTudo')?.addEventListener('click', async () => {
    if (!confirm('Deseja apagar todos os pedidos atuais?')) return;
    try { await limparPedidos(); render(); toast('Lista limpa.'); } catch (e) { console.error(e); toast('Erro ao limpar lista.'); }
  });

  $('salvarMes')?.addEventListener('click', async () => {
    try { await salvarListaMes(); } catch (e) { console.error(e); toast('Erro ao salvar lista do mês. Rode o supabase.sql atualizado.'); }
  });

  $('carregarHistorico')?.addEventListener('click', carregarHistorico);

  document.addEventListener('change', e => {
    const check = e.target.closest('[data-check-id]');
    if (check) toggleCheck(check.dataset.checkId);
  });

  document.addEventListener('click', e => {
    const edit = e.target.closest('[data-edit-id]');
    if (edit) editarPedido(edit.dataset.editId);
    const del = e.target.closest('[data-delete-id]');
    if (del) excluirPedido(del.dataset.deleteId);
    const rem = e.target.closest('[data-remove-product]');
    if (rem) excluirProduto(rem.dataset.removeProduct);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadLocal();
  initEvents();
  renderAll();
  carregarPedidos();
});
