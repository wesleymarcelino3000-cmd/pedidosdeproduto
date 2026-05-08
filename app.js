const STORAGE_KEY = 'pedidos_produtos_innolife_v3';
const HIST_KEY = 'pedidos_produtos_innolife_historico_v1';

const SUPABASE_URL = 'https://joaeftlwrseqmwijvqii.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2qwk-Z5LXdz_ebi2Cp7MKQ_EUQ5idXS';
const TABLE = 'pedidos_produtos';
const ARCHIVE_TABLE = 'listas_pedidos_mensais';

let pedidos = [];
let historico = [];
let usandoNuvem = true;

const $ = (id) => document.getElementById(id);
const api = `${SUPABASE_URL}/rest/v1/${TABLE}`;
const archiveApi = `${SUPABASE_URL}/rest/v1/${ARCHIVE_TABLE}`;

function headers(extra = {}){
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...extra };
}
function saveLocal(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(pedidos)); }
function saveHistLocal(){ localStorage.setItem(HIST_KEY, JSON.stringify(historico)); }
function loadLocal(){ pedidos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); historico = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); }
function normalize(row){ return { id: row.id, funcionario: row.funcionario, produto: row.produto, quantidade: Number(row.quantidade), checked: Boolean(row.checked), createdAt: row.created_at || row.createdAt || new Date().toISOString(), arquivado: Boolean(row.arquivado) }; }
function normalizeArchive(row){ return { id: row.id, mes: row.mes_referencia || row.mes, observacao: row.observacao || '', totalPedidos: row.total_pedidos || row.totalPedidos || 0, totalItens: row.total_itens || row.totalItens || 0, pedidos: row.pedidos_json || row.pedidos || [], createdAt: row.created_at || row.createdAt || new Date().toISOString() }; }
function setStatus(text){ const el = $('statusConexao'); if(el) el.textContent = text; }
function toast(msg){ const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2600); }
function fmtDate(iso){ return new Date(iso).toLocaleString('pt-BR'); }
function currentMonth(){ return new Date().toISOString().slice(0,7); }

async function carregarPedidos(){
  try{
    setStatus('Conectando na nuvem...');
    const res = await fetch(`${api}?select=*&arquivado=eq.false&order=created_at.desc`, { headers: headers() });
    if(!res.ok) throw new Error(await res.text());
    pedidos = (await res.json()).map(normalize);
    usandoNuvem = true; saveLocal(); setStatus('Online • Supabase');
    await carregarHistorico();
  }catch(err){
    console.warn(err); usandoNuvem = false; loadLocal(); setStatus('Modo local • atualize o supabase.sql');
  }
  render();
}
async function carregarHistorico(){
  if(!usandoNuvem){ loadLocal(); renderHistorico(); return; }
  try{
    const res = await fetch(`${archiveApi}?select=*&order=created_at.desc`, { headers: headers() });
    if(!res.ok) throw new Error(await res.text());
    historico = (await res.json()).map(normalizeArchive); saveHistLocal(); renderHistorico();
  }catch(err){ console.warn(err); historico = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); renderHistorico(); }
}
async function criarPedido(payload){
  if(!usandoNuvem){ pedidos.unshift({ id: crypto.randomUUID(), ...payload, checked:false, arquivado:false, createdAt:new Date().toISOString() }); saveLocal(); return; }
  const res = await fetch(api, { method:'POST', headers:headers(), body:JSON.stringify({ funcionario:payload.funcionario, produto:payload.produto, quantidade:payload.quantidade, checked:false, arquivado:false }) });
  if(!res.ok) throw new Error(await res.text()); pedidos.unshift(normalize((await res.json())[0])); saveLocal();
}
async function atualizarPedido(id, patch){
  if(!usandoNuvem){ pedidos = pedidos.map(p=>p.id===id?{...p,...patch}:p); saveLocal(); return; }
  const res = await fetch(`${api}?id=eq.${id}`, { method:'PATCH', headers:headers(), body:JSON.stringify(patch) });
  if(!res.ok) throw new Error(await res.text()); pedidos = pedidos.map(p=>p.id===id?normalize((await res.json())[0]):p); saveLocal();
}
async function removerPedido(id){
  if(!usandoNuvem){ pedidos = pedidos.filter(p=>p.id!==id); saveLocal(); return; }
  const res = await fetch(`${api}?id=eq.${id}`, { method:'DELETE', headers:headers() });
  if(!res.ok) throw new Error(await res.text()); pedidos = pedidos.filter(p=>p.id!==id); saveLocal();
}
async function limparPedidos(){
  if(!usandoNuvem){ pedidos=[]; saveLocal(); return; }
  const res = await fetch(`${api}?arquivado=eq.false`, { method:'DELETE', headers:headers() });
  if(!res.ok) throw new Error(await res.text()); pedidos=[]; saveLocal();
}
async function salvarListaMes(){
  if(!pedidos.length){ toast('Não existe pedido para salvar.'); return; }
  const mes = $('mesReferencia').value || currentMonth();
  const observacao = $('obsMes').value.trim() || 'Lista mensal atendida';
  const totalPedidos = pedidos.length;
  const totalItens = pedidos.reduce((s,p)=>s+Number(p.quantidade),0);
  const snapshot = pedidos.map(p=>({ funcionario:p.funcionario, produto:p.produto, quantidade:p.quantidade, checked:p.checked, data:p.createdAt }));
  if(!confirm(`Salvar a lista de ${mes} como atendida e limpar a lista atual?`)) return;
  if(!usandoNuvem){
    historico.unshift({ id: crypto.randomUUID(), mes, observacao, totalPedidos, totalItens, pedidos:snapshot, createdAt:new Date().toISOString() });
    pedidos=[]; saveLocal(); saveHistLocal(); render(); renderHistorico(); toast('Lista do mês salva.'); return;
  }
  const ins = await fetch(archiveApi,{method:'POST',headers:headers(),body:JSON.stringify({mes_referencia:mes,observacao,total_pedidos:totalPedidos,total_itens:totalItens,pedidos_json:snapshot})});
  if(!ins.ok) throw new Error(await ins.text());
  const ids = pedidos.map(p=>p.id);
  for(const id of ids){ await fetch(`${api}?id=eq.${id}`,{method:'PATCH',headers:headers(),body:JSON.stringify({arquivado:true, checked:true})}); }
  pedidos=[]; saveLocal(); await carregarHistorico(); render(); toast('Lista do mês salva e lista atual limpa.');
}

function render(){
  const busca = ($('busca')?.value || '').toLowerCase();
  const lista = $('listaPedidos'); lista.innerHTML='';
  const filtrados = pedidos.filter(p=>p.funcionario.toLowerCase().includes(busca)||p.produto.toLowerCase().includes(busca));
  if(!filtrados.length){ lista.appendChild($('emptyTemplate').content.cloneNode(true)); }
  else filtrados.forEach(p=>{ const tr=document.createElement('tr'); if(p.checked) tr.classList.add('checked'); tr.innerHTML=`<td><input class="check" type="checkbox" ${p.checked?'checked':''} onchange="toggleCheck('${p.id}')"></td><td><strong>${escapeHtml(p.funcionario)}</strong></td><td>${escapeHtml(p.produto)}</td><td><strong>${p.quantidade}</strong></td><td>${fmtDate(p.createdAt)}</td><td><button class="mini" onclick="editarPedido('${p.id}')">Editar</button><button class="mini delete" onclick="excluirPedido('${p.id}')">Excluir</button></td>`; lista.appendChild(tr); });
  $('totalPedidos').textContent=pedidos.length; $('totalItens').textContent=pedidos.reduce((s,p)=>s+Number(p.quantidade),0); $('totalCheck').textContent=pedidos.filter(p=>p.checked).length;
  const prev = $('previewMes'); if(prev) prev.textContent = `Lista atual: ${pedidos.length} pedidos • ${pedidos.reduce((s,p)=>s+Number(p.quantidade),0)} itens • ${pedidos.filter(p=>p.checked).length} conferidos.`;
  renderResumo();
}
function renderResumo(){ const box=$('resumoProdutos'); box.innerHTML=''; if(!pedidos.length){box.innerHTML='<p class="empty">Nenhum produto para consolidar.</p>'; return;} const grupos={}; pedidos.forEach(p=>{const key=p.produto.trim(); if(!grupos[key]) grupos[key]={total:0,pessoas:[]}; grupos[key].total+=Number(p.quantidade); grupos[key].pessoas.push(`${p.funcionario}: ${p.quantidade}${p.checked?' ✓':''}`);}); Object.entries(grupos).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([produto,info])=>{const card=document.createElement('div'); card.className='card'; card.innerHTML=`<h4>${escapeHtml(produto)}</h4><div class="qty">${info.total}</div><small>Total solicitado</small><ul>${info.pessoas.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`; box.appendChild(card);}); }
function renderHistorico(){ const box=$('historicoListas'); if(!box) return; box.innerHTML=''; if(!historico.length){ box.innerHTML='<p class="empty">Nenhuma lista mensal salva ainda.</p>'; return; } historico.forEach(h=>{ const div=document.createElement('div'); div.className='history-card'; const resumo={}; (h.pedidos||[]).forEach(p=>{resumo[p.produto]=(resumo[p.produto]||0)+Number(p.quantidade)}); div.innerHTML=`<h4>Lista ${escapeHtml(h.mes)}</h4><div class="meta">Salva em ${fmtDate(h.createdAt)} • ${h.totalPedidos} pedidos • ${h.totalItens} itens</div><p>${escapeHtml(h.observacao)}</p><details><summary>Ver produtos e funcionários</summary><ul>${Object.entries(resumo).map(([prod,q])=>`<li><strong>${escapeHtml(prod)}</strong>: ${q}</li>`).join('')}</ul><hr><ul>${(h.pedidos||[]).map(p=>`<li>${escapeHtml(p.funcionario)} — ${escapeHtml(p.produto)} — ${p.quantidade}</li>`).join('')}</ul></details>`; box.appendChild(div); }); }
async function toggleCheck(id){ const p=pedidos.find(x=>x.id===id); if(!p) return; try{ await atualizarPedido(id,{checked:!p.checked}); render(); }catch(e){ toast('Erro ao atualizar check.'); } }
async function excluirPedido(id){ if(!confirm('Deseja excluir este pedido?')) return; try{ await removerPedido(id); render(); toast('Pedido excluído.'); }catch(e){ toast('Erro ao excluir pedido.'); } }
async function editarPedido(id){ const p=pedidos.find(x=>x.id===id); if(!p) return; const funcionario=prompt('Funcionário:',p.funcionario); if(funcionario===null) return; const produto=prompt('Produto:',p.produto); if(produto===null) return; const quantidade=prompt('Quantidade:',p.quantidade); if(quantidade===null) return; const qtd=Number(quantidade); if(!funcionario.trim()||!produto.trim()||!qtd||qtd<1){ alert('Preencha os dados corretamente.'); return; } try{ await atualizarPedido(id,{funcionario:funcionario.trim(),produto:produto.trim(),quantidade:qtd}); render(); toast('Pedido atualizado.'); }catch(e){ toast('Erro ao editar pedido.'); } }
function escapeHtml(str){ return String(str).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

$('mesReferencia').value=currentMonth();
$('pedidoForm').addEventListener('submit',async(e)=>{ e.preventDefault(); const funcionario=$('funcionario').value.trim(); const produto=$('produto').value.trim(); const quantidade=Number($('quantidade').value); if(!funcionario||!produto||quantidade<1)return; const btn=e.target.querySelector('button[type="submit"]'); btn.disabled=true; btn.textContent='Salvando...'; try{ await criarPedido({funcionario,produto,quantidade}); render(); e.target.reset(); $('quantidade').value=1; $('funcionario').focus(); toast('Pedido adicionado.'); }catch(err){ console.error(err); toast('Erro ao salvar. Rode o supabase.sql atualizado.'); }finally{ btn.disabled=false; btn.textContent='Adicionar pedido'; } });
$('busca').addEventListener('input',render); $('limparTudo').addEventListener('click',async()=>{ if(!confirm('Deseja apagar todos os pedidos atuais?'))return; try{ await limparPedidos(); render(); toast('Lista limpa.'); }catch(e){ toast('Erro ao limpar lista.'); } });
$('salvarMes').addEventListener('click',async()=>{ try{ await salvarListaMes(); }catch(e){ console.error(e); toast('Erro ao salvar lista do mês. Rode o supabase.sql atualizado.'); } });
$('carregarHistorico').addEventListener('click',carregarHistorico); $('recarregar').addEventListener('click',carregarPedidos);
document.querySelectorAll('.nav[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{ document.querySelectorAll('.nav').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); document.querySelectorAll('.tab').forEach(t=>t.classList.remove('show')); $('tab-'+btn.dataset.tab).classList.add('show'); }));
carregarPedidos();
