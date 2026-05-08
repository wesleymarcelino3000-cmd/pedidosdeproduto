'use strict';

const STORAGE_KEY = 'pedidos_produtos_innolife_v5';
const HIST_KEY = 'pedidos_produtos_innolife_historico_v2';
const PROD_KEY = 'pedidos_produtos_innolife_produtos_v1';

const SUPABASE_URL = 'https://joaeftlwrseqmwijvqii.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2qwk-Z5LXdz_ebi2Cp7MKQ_EUQ5idXS';
const TABLE = 'pedidos_produtos';
const ARCHIVE_TABLE = 'listas_pedidos_mensais';
const PRODUCT_TABLE = 'produtos_cadastrados';

let pedidos = [];
let historico = [];
let produtos = ['Melasonina', 'Bom Hálito', 'Pulmoclean', 'DrySkin'];
let usandoNuvem = true;

const $ = (id) => document.getElementById(id);
const api = `${SUPABASE_URL}/rest/v1/${TABLE}`;
const archiveApi = `${SUPABASE_URL}/rest/v1/${ARCHIVE_TABLE}`;
const productApi = `${SUPABASE_URL}/rest/v1/${PRODUCT_TABLE}`;

function headers(extra = {}) {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json', ...extra };
}
async function supaFetch(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const detalhe = typeof data === 'object' && data ? (data.message || data.hint || data.details || JSON.stringify(data)) : String(data || res.statusText);
    throw new Error(`Supabase ${res.status}: ${detalhe}`);
  }
  return data;
}
function saveLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify(pedidos)); }
function saveHistLocal() { localStorage.setItem(HIST_KEY, JSON.stringify(historico)); }
function saveProdLocal() { localStorage.setItem(PROD_KEY, JSON.stringify(produtos)); }
function loadLocal() {
  pedidos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  historico = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
  produtos = JSON.parse(localStorage.getItem(PROD_KEY) || JSON.stringify(produtos));
}
function normalize(row) {
  return { id: row.id, funcionario: row.funcionario, produto: row.produto, quantidade: Number(row.quantidade), checked: Boolean(row.checked), createdAt: row.created_at || row.createdAt || new Date().toISOString(), arquivado: Boolean(row.arquivado) };
}
function normalizeArchive(row) {
  return { id: row.id, mes: row.mes_referencia || row.mes, dataLista: row.data_lista || row.dataLista || '', observacao: row.observacao || '', totalPedidos: row.total_pedidos || row.totalPedidos || 0, totalItens: row.total_itens || row.totalItens || 0, pedidos: row.pedidos_json || row.pedidos || [], createdAt: row.created_at || row.createdAt || new Date().toISOString() };
}
function normalizeProduct(row) { return row.nome || row.produto || row.name || ''; }
function setStatus(text) { const el = $('statusConexao'); if (el) el.textContent = text; }
function toast(msg) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; document.body.appendChild(el); setTimeout(() => el.remove(), 2600); }
function fmtDate(iso) { try { return new Date(iso).toLocaleString('pt-BR'); } catch { return '-'; } }
function currentMonth() { return new Date().toISOString().slice(0, 7); }
function currentDate() { return new Date().toISOString().slice(0, 10); }
function fmtDateOnly(dateStr) { if (!dateStr) return '-'; const [y,m,d] = String(dateStr).slice(0,10).split('-'); return y && m && d ? `${d}/${m}/${y}` : dateStr; }
function escapeHtml(str) { return String(str ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }

function abrirAba(nome) {
  document.querySelectorAll('.nav[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === nome));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('show'));
  const tab = $(`tab-${nome}`);
  if (tab) tab.classList.add('show');
}

async function carregarPedidos() {
  try {
    setStatus('Conectando na nuvem...');
    const data = await supaFetch(`${api}?select=*&arquivado=eq.false&order=created_at.desc`, { headers: headers() });
    pedidos = data.map(normalize);
    usandoNuvem = true;
    saveLocal();
    setStatus('Online • Supabase');
    await carregarProdutos();
    await carregarHistorico();
  } catch (err) {
    console.warn(err);
    usandoNuvem = false;
    loadLocal();
    setStatus('Erro Supabase • rodar SQL');
    toast('Não conectou no Supabase: ' + err.message);
  }
  renderTudo();
}

async function carregarHistorico() {
  if (!usandoNuvem) { loadLocal(); renderHistorico(); return; }
  try {
    const data = await supaFetch(`${archiveApi}?select=*&order=created_at.desc`, { headers: headers() });
    historico = data.map(normalizeArchive);
    saveHistLocal();
  } catch (err) {
    console.warn(err);
    historico = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
  }
  renderHistorico();
}

async function carregarProdutos() {
  if (!usandoNuvem) { loadLocal(); renderProdutos(); return; }
  try {
    const data = await supaFetch(`${productApi}?select=*&order=nome.asc`, { headers: headers() });
    const lista = data.map(normalizeProduct).filter(Boolean);
    produtos = [...new Set([...produtos, ...lista])].sort((a, b) => a.localeCompare(b));
    saveProdLocal();
  } catch (err) {
    console.warn(err);
    produtos = JSON.parse(localStorage.getItem(PROD_KEY) || JSON.stringify(produtos));
  }
  renderProdutos();
}

async function criarPedido(payload) {
  if (!usandoNuvem) {
    pedidos.unshift({ id: crypto.randomUUID(), ...payload, checked: false, arquivado: false, createdAt: new Date().toISOString() });
    saveLocal();
    return;
  }
  const data = await supaFetch(api, { method: 'POST', headers: headers({ Prefer: 'return=representation' }), body: JSON.stringify({ funcionario: payload.funcionario, produto: payload.produto, quantidade: payload.quantidade, checked: false, arquivado: false }) });
  pedidos.unshift(normalize(data[0]));
  saveLocal();
}
async function atualizarPedido(id, patch) {
  if (!usandoNuvem) { pedidos = pedidos.map(p => p.id === id ? { ...p, ...patch } : p); saveLocal(); return; }
  const data = await supaFetch(`${api}?id=eq.${id}`, { method: 'PATCH', headers: headers({ Prefer: 'return=representation' }), body: JSON.stringify(patch) });
  pedidos = pedidos.map(p => p.id === id ? normalize(data[0]) : p);
  saveLocal();
}
async function removerPedido(id) {
  if (!usandoNuvem) { pedidos = pedidos.filter(p => p.id !== id); saveLocal(); return; }
  await supaFetch(`${api}?id=eq.${id}`, { method: 'DELETE', headers: headers() });
  pedidos = pedidos.filter(p => p.id !== id);
  saveLocal();
}
async function limparPedidos() {
  if (!usandoNuvem) { pedidos = []; saveLocal(); return; }
  await supaFetch(`${api}?arquivado=eq.false`, { method: 'DELETE', headers: headers() });
  pedidos = [];
  saveLocal();
}
async function salvarListaMes() {
  if (!pedidos.length) { toast('Não existe pedido para salvar.'); return; }
  const dataLista = $('dataLista').value || currentDate();
  const mes = $('mesReferencia').value || dataLista.slice(0, 7) || currentMonth();
  const observacao = $('obsMes').value.trim() || 'Lista mensal atendida';
  const totalPedidos = pedidos.length;
  const totalItens = pedidos.reduce((s, p) => s + Number(p.quantidade), 0);
  const snapshot = pedidos.map(p => ({ funcionario: p.funcionario, produto: p.produto, quantidade: p.quantidade, checked: p.checked, data: p.createdAt }));
  if (!confirm(`Salvar a lista de ${mes} como atendida e limpar a lista atual?`)) return;
  if (!usandoNuvem) {
    historico.unshift({ id: crypto.randomUUID(), mes, dataLista, observacao, totalPedidos, totalItens, pedidos: snapshot, createdAt: new Date().toISOString() });
    pedidos = [];
    saveLocal(); saveHistLocal(); renderTudo(); toast('Lista do mês salva.'); return;
  }
  await supaFetch(archiveApi, { method: 'POST', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify({ mes_referencia: mes, data_lista: dataLista, observacao, total_pedidos: totalPedidos, total_itens: totalItens, pedidos_json: snapshot }) });
  for (const id of pedidos.map(p => p.id)) {
    await supaFetch(`${api}?id=eq.${id}`, { method: 'PATCH', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify({ arquivado: true, checked: true }) });
  }
  pedidos = [];
  saveLocal();
  await carregarHistorico();
  renderTudo();
  toast('Lista do mês salva e lista atual limpa.');
}
async function cadastrarProduto(nome) {
  nome = nome.trim();
  if (!nome) return;
  if (!produtos.some(p => p.toLowerCase() === nome.toLowerCase())) produtos.push(nome);
  produtos.sort((a, b) => a.localeCompare(b));
  saveProdLocal();
  renderProdutos();
  if (usandoNuvem) {
    try {
      await supaFetch(productApi, { method: 'POST', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify({ nome }) });
    } catch (e) {
      if (!String(e.message).toLowerCase().includes('duplicate') && !String(e.message).toLowerCase().includes('unique')) throw e;
    }
  }
}
function excluirProdutoLocal(nome) {
  if (!confirm(`Excluir o produto "${nome}" da lista de seleção?`)) return;
  produtos = produtos.filter(p => p !== nome);
  saveProdLocal();
  renderProdutos();
  toast('Produto removido da seleção.');
}

function renderTudo() { renderPedidos(); renderResumo(); renderHistorico(); renderProdutos(); }
function renderPedidos() {
  const lista = $('listaPedidos');
  if (!lista) return;
  const busca = ($('busca')?.value || '').toLowerCase();
  lista.innerHTML = '';
  const filtrados = pedidos.filter(p => p.funcionario.toLowerCase().includes(busca) || p.produto.toLowerCase().includes(busca));
  if (!filtrados.length) lista.appendChild($('emptyTemplate').content.cloneNode(true));
  else filtrados.forEach(p => {
    const tr = document.createElement('tr');
    if (p.checked) tr.classList.add('checked');
    tr.innerHTML = `<td><input class="check" type="checkbox" ${p.checked ? 'checked' : ''} data-action="check" data-id="${p.id}"></td><td><strong>${escapeHtml(p.funcionario)}</strong></td><td>${escapeHtml(p.produto)}</td><td><strong>${p.quantidade}</strong></td><td>${fmtDate(p.createdAt)}</td><td><button type="button" class="mini" data-action="edit" data-id="${p.id}">Editar</button><button type="button" class="mini delete" data-action="delete" data-id="${p.id}">Excluir</button></td>`;
    lista.appendChild(tr);
  });
  $('totalPedidos').textContent = pedidos.length;
  $('totalItens').textContent = pedidos.reduce((s, p) => s + Number(p.quantidade), 0);
  $('totalCheck').textContent = pedidos.filter(p => p.checked).length;
  const prev = $('previewMes');
  if (prev) prev.textContent = `Lista atual: ${pedidos.length} pedidos • ${pedidos.reduce((s, p) => s + Number(p.quantidade), 0)} itens • ${pedidos.filter(p => p.checked).length} conferidos • Data selecionada: ${fmtDateOnly($('dataLista')?.value || currentDate())}.`;
}
function renderResumo() {
  const box = $('resumoProdutos');
  if (!box) return;
  box.innerHTML = '';
  if (!pedidos.length) { box.innerHTML = '<p class="empty">Nenhum produto para consolidar.</p>'; return; }
  const grupos = {};
  pedidos.forEach(p => { const key = p.produto.trim(); if (!grupos[key]) grupos[key] = { total: 0, pessoas: [] }; grupos[key].total += Number(p.quantidade); grupos[key].pessoas.push(`${p.funcionario}: ${p.quantidade}${p.checked ? ' ✓' : ''}`); });
  Object.entries(grupos).sort((a, b) => a[0].localeCompare(b[0])).forEach(([produto, info]) => {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<h4>${escapeHtml(produto)}</h4><div class="qty">${info.total}</div><small>Total solicitado</small><ul>${info.pessoas.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
    box.appendChild(card);
  });
}
function renderHistorico() {
  const box = $('historicoListas');
  if (!box) return;
  box.innerHTML = '';
  if (!historico.length) { box.innerHTML = '<p class="empty">Nenhuma lista mensal salva ainda.</p>'; return; }
  historico.forEach(h => {
    const div = document.createElement('div'); div.className = 'history-card';
    const resumo = {};
    (h.pedidos || []).forEach(p => { resumo[p.produto] = (resumo[p.produto] || 0) + Number(p.quantidade); });
    div.innerHTML = `<h4>Lista ${escapeHtml(h.mes)}</h4><div class="meta">Data da lista: ${fmtDateOnly(h.dataLista)} • Salva em ${fmtDate(h.createdAt)} • ${h.totalPedidos} pedidos • ${h.totalItens} itens</div><p>${escapeHtml(h.observacao)}</p><details><summary>Ver produtos e funcionários</summary><ul>${Object.entries(resumo).map(([prod, q]) => `<li><strong>${escapeHtml(prod)}</strong>: ${q}</li>`).join('')}</ul><hr><ul>${(h.pedidos || []).map(p => `<li>${escapeHtml(p.funcionario)} — ${escapeHtml(p.produto)} — ${p.quantidade}</li>`).join('')}</ul></details>`;
    box.appendChild(div);
  });
}
function renderProdutos() {
  const select = $('produtoSelect');
  if (select) {
    select.innerHTML = '<option value="">Selecione um produto</option>' + produtos.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  }
  const box = $('listaProdutos');
  if (!box) return;
  box.innerHTML = produtos.map(p => `<div class="product-pill"><span>${escapeHtml(p)}</span><button type="button" data-produto="${escapeHtml(p)}">Remover</button></div>`).join('');
}

async function toggleCheck(id) { const p = pedidos.find(x => x.id === id); if (!p) return; try { await atualizarPedido(id, { checked: !p.checked }); renderTudo(); } catch (e) { console.error(e); toast('Erro ao atualizar check.'); } }
async function excluirPedido(id) { if (!confirm('Deseja excluir este pedido?')) return; try { await removerPedido(id); renderTudo(); toast('Pedido excluído.'); } catch (e) { console.error(e); toast('Erro ao excluir pedido.'); } }
async function editarPedido(id) {
  const p = pedidos.find(x => x.id === id); if (!p) return;
  const funcionario = prompt('Funcionário:', p.funcionario); if (funcionario === null) return;
  const produto = prompt('Produto:', p.produto); if (produto === null) return;
  const quantidade = prompt('Quantidade:', p.quantidade); if (quantidade === null) return;
  const qtd = Number(quantidade);
  if (!funcionario.trim() || !produto.trim() || !qtd || qtd < 1) { alert('Preencha os dados corretamente.'); return; }
  try { await atualizarPedido(id, { funcionario: funcionario.trim(), produto: produto.trim(), quantidade: qtd }); renderTudo(); toast('Pedido atualizado.'); } catch (e) { console.error(e); toast('Erro ao editar pedido.'); }
}

function configurarEventos() {
  $('dataLista').value = currentDate();
  $('mesReferencia').value = currentMonth();
  document.querySelectorAll('.nav[data-tab]').forEach(btn => btn.addEventListener('click', () => abrirAba(btn.dataset.tab)));
  $('recarregar').addEventListener('click', carregarPedidos);
  $('imprimir').addEventListener('click', () => window.print());
  $('busca').addEventListener('input', renderPedidos);
  $('limparTudo').addEventListener('click', async () => { if (!confirm('Deseja apagar todos os pedidos atuais?')) return; try { await limparPedidos(); renderTudo(); toast('Lista limpa.'); } catch (e) { console.error(e); toast('Erro ao limpar lista.'); } });
  $('dataLista').addEventListener('change', renderPedidos);
  $('mesReferencia').addEventListener('change', renderPedidos);
  $('salvarMes').addEventListener('click', async () => { try { await salvarListaMes(); } catch (e) { console.error(e); toast('Erro Supabase: ' + e.message); } });
  $('carregarHistorico').addEventListener('click', carregarHistorico);

  $('pedidoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const funcionario = $('funcionario').value.trim();
    const produto = ($('produtoLivre').value.trim() || $('produtoSelect').value.trim());
    const quantidade = Number($('quantidade').value);
    if (!funcionario || !produto || quantidade < 1) { toast('Preencha funcionário, produto e quantidade.'); return; }
    const btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      await criarPedido({ funcionario, produto, quantidade });
      if (!produtos.some(p => p.toLowerCase() === produto.toLowerCase())) { produtos.push(produto); produtos.sort((a, b) => a.localeCompare(b)); saveProdLocal(); }
      renderTudo(); e.target.reset(); $('quantidade').value = 1; $('funcionario').focus(); toast('Pedido adicionado.'); abrirAba('lista');
    } catch (err) { console.error(err); toast('Erro Supabase: ' + err.message); }
    finally { btn.disabled = false; btn.textContent = 'Adicionar pedido'; }
  });

  $('produtoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = $('novoProduto').value.trim();
    if (!nome) { toast('Digite o nome do produto.'); return; }
    try { await cadastrarProduto(nome); $('novoProduto').value = ''; toast('Produto cadastrado.'); } catch (err) { console.error(err); toast('Produto local. Erro Supabase: ' + err.message); }
  });

  $('listaPedidos').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit') editarPedido(id);
    if (btn.dataset.action === 'delete') excluirPedido(id);
  });
  $('listaPedidos').addEventListener('change', (e) => {
    const el = e.target.closest('[data-action="check"]');
    if (el) toggleCheck(el.dataset.id);
  });
  $('listaProdutos').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-produto]');
    if (btn) excluirProdutoLocal(btn.dataset.produto);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  try { configurarEventos(); carregarPedidos(); }
  catch (err) { console.error(err); setStatus('Erro no app'); alert('Erro ao iniciar o app. Verifique se todos os arquivos foram enviados.'); }
});
