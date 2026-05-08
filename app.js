const STORAGE_KEY = 'pedidos_produtos_innolife_v2';

// Supabase configurado com os dados enviados
const SUPABASE_URL = 'https://joaeftlwrseqmwijvqii.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2qwk-Z5LXdz_ebi2Cp7MKQ_EUQ5idXS';
const TABLE = 'pedidos_produtos';

let pedidos = [];
let usandoNuvem = true;

const $ = (id) => document.getElementById(id);
const api = `${SUPABASE_URL}/rest/v1/${TABLE}`;

function headers(extra = {}){
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...extra
  };
}

function saveLocal(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pedidos));
}

function loadLocal(){
  pedidos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function normalize(row){
  return {
    id: row.id,
    funcionario: row.funcionario,
    produto: row.produto,
    quantidade: Number(row.quantidade),
    checked: Boolean(row.checked),
    createdAt: row.created_at || row.createdAt || new Date().toISOString()
  };
}

async function carregarPedidos(){
  try{
    setStatus('Conectando na nuvem...');
    const res = await fetch(`${api}?select=*&order=created_at.desc`, { headers: headers() });
    if(!res.ok) throw new Error(await res.text());
    const data = await res.json();
    pedidos = data.map(normalize);
    usandoNuvem = true;
    saveLocal();
    setStatus('Online • Supabase');
  }catch(err){
    console.warn('Falha ao carregar Supabase, usando localStorage:', err);
    usandoNuvem = false;
    loadLocal();
    setStatus('Modo local • rode o supabase.sql no Supabase');
  }
  render();
}

async function criarPedido(payload){
  if(!usandoNuvem){
    pedidos.unshift({ id: crypto.randomUUID(), ...payload, checked:false, createdAt:new Date().toISOString() });
    saveLocal();
    return;
  }
  const res = await fetch(api, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      funcionario: payload.funcionario,
      produto: payload.produto,
      quantidade: payload.quantidade,
      checked: false
    })
  });
  if(!res.ok) throw new Error(await res.text());
  const [novo] = await res.json();
  pedidos.unshift(normalize(novo));
  saveLocal();
}

async function atualizarPedido(id, patch){
  if(!usandoNuvem){
    pedidos = pedidos.map(p => p.id === id ? {...p, ...patch} : p);
    saveLocal();
    return;
  }
  const body = {};
  if('funcionario' in patch) body.funcionario = patch.funcionario;
  if('produto' in patch) body.produto = patch.produto;
  if('quantidade' in patch) body.quantidade = patch.quantidade;
  if('checked' in patch) body.checked = patch.checked;

  const res = await fetch(`${api}?id=eq.${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error(await res.text());
  const [atualizado] = await res.json();
  pedidos = pedidos.map(p => p.id === id ? normalize(atualizado) : p);
  saveLocal();
}

async function removerPedido(id){
  if(!usandoNuvem){
    pedidos = pedidos.filter(p => p.id !== id);
    saveLocal();
    return;
  }
  const res = await fetch(`${api}?id=eq.${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  if(!res.ok) throw new Error(await res.text());
  pedidos = pedidos.filter(p => p.id !== id);
  saveLocal();
}

async function limparPedidos(){
  if(!usandoNuvem){
    pedidos = [];
    saveLocal();
    return;
  }
  const res = await fetch(`${api}?id=not.is.null`, {
    method: 'DELETE',
    headers: headers()
  });
  if(!res.ok) throw new Error(await res.text());
  pedidos = [];
  saveLocal();
}

function setStatus(text){
  const el = $('statusConexao');
  if(el) el.textContent = text;
}

function toast(msg){
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),2400);
}

function fmtDate(iso){
  return new Date(iso).toLocaleString('pt-BR');
}

function render(){
  const busca = ($('busca')?.value || '').toLowerCase();
  const lista = $('listaPedidos');
  lista.innerHTML = '';
  const filtrados = pedidos.filter(p =>
    p.funcionario.toLowerCase().includes(busca) || p.produto.toLowerCase().includes(busca)
  );

  if(!filtrados.length){
    lista.appendChild($('emptyTemplate').content.cloneNode(true));
  } else {
    filtrados.forEach(p => {
      const tr = document.createElement('tr');
      if(p.checked) tr.classList.add('checked');
      tr.innerHTML = `
        <td><input class="check" type="checkbox" ${p.checked ? 'checked' : ''} onchange="toggleCheck('${p.id}')"></td>
        <td><strong>${escapeHtml(p.funcionario)}</strong></td>
        <td>${escapeHtml(p.produto)}</td>
        <td><strong>${p.quantidade}</strong></td>
        <td>${fmtDate(p.createdAt)}</td>
        <td>
          <button class="mini" onclick="editarPedido('${p.id}')">Editar</button>
          <button class="mini delete" onclick="excluirPedido('${p.id}')">Excluir</button>
        </td>`;
      lista.appendChild(tr);
    });
  }

  $('totalPedidos').textContent = pedidos.length;
  $('totalItens').textContent = pedidos.reduce((s,p)=>s + Number(p.quantidade),0);
  $('totalCheck').textContent = pedidos.filter(p=>p.checked).length;
  renderResumo();
}

function renderResumo(){
  const box = $('resumoProdutos');
  box.innerHTML = '';
  if(!pedidos.length){
    box.innerHTML = '<p class="empty">Nenhum produto para consolidar.</p>';
    return;
  }
  const grupos = {};
  pedidos.forEach(p => {
    const key = p.produto.trim();
    if(!grupos[key]) grupos[key] = { total:0, pessoas:[] };
    grupos[key].total += Number(p.quantidade);
    grupos[key].pessoas.push(`${p.funcionario}: ${p.quantidade}${p.checked ? ' ✓' : ''}`);
  });

  Object.entries(grupos).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([produto, info])=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h4>${escapeHtml(produto)}</h4>
      <div class="qty">${info.total}</div>
      <small>Total solicitado</small>
      <ul>${info.pessoas.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
    box.appendChild(card);
  });
}

async function toggleCheck(id){
  const p = pedidos.find(x=>x.id===id);
  if(!p) return;
  try{
    await atualizarPedido(id, { checked: !p.checked });
    render();
  }catch(err){
    toast('Erro ao atualizar check. Veja o SQL do Supabase.');
  }
}

async function excluirPedido(id){
  if(!confirm('Deseja excluir este pedido?')) return;
  try{
    await removerPedido(id);
    render();
    toast('Pedido excluído.');
  }catch(err){
    toast('Erro ao excluir pedido.');
  }
}

async function editarPedido(id){
  const p = pedidos.find(x=>x.id===id);
  if(!p) return;
  const funcionario = prompt('Funcionário:', p.funcionario);
  if(funcionario === null) return;
  const produto = prompt('Produto:', p.produto);
  if(produto === null) return;
  const quantidade = prompt('Quantidade:', p.quantidade);
  if(quantidade === null) return;
  const qtd = Number(quantidade);
  if(!funcionario.trim() || !produto.trim() || !qtd || qtd < 1){
    alert('Preencha os dados corretamente.');
    return;
  }
  try{
    await atualizarPedido(id, { funcionario: funcionario.trim(), produto: produto.trim(), quantidade: qtd });
    render();
    toast('Pedido atualizado.');
  }catch(err){
    toast('Erro ao editar pedido.');
  }
}

function escapeHtml(str){
  return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

$('pedidoForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const funcionario = $('funcionario').value.trim();
  const produto = $('produto').value.trim();
  const quantidade = Number($('quantidade').value);
  if(!funcionario || !produto || quantidade < 1) return;

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Salvando...';
  try{
    await criarPedido({ funcionario, produto, quantidade });
    render();
    e.target.reset();
    $('quantidade').value = 1;
    $('funcionario').focus();
    toast('Pedido adicionado.');
  }catch(err){
    console.error(err);
    toast('Erro ao salvar. Rode o arquivo supabase.sql.');
  }finally{
    btn.disabled = false;
    btn.textContent = 'Adicionar pedido';
  }
});

$('busca').addEventListener('input', render);
$('limparTudo').addEventListener('click', async ()=>{
  if(!confirm('Deseja apagar todos os pedidos?')) return;
  try{
    await limparPedidos();
    render();
    toast('Lista limpa.');
  }catch(err){
    toast('Erro ao limpar lista.');
  }
});

$('recarregar').addEventListener('click', carregarPedidos);

document.querySelectorAll('.nav[data-tab]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.nav').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('show'));
    $('tab-' + btn.dataset.tab).classList.add('show');
  });
});

carregarPedidos();
