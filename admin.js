const SUPABASE_URL='https://pgwpnerwuqvvqvjiwrni.supabase.co';
const SUPABASE_KEY='sb_publishable_klHvc23t0_mQNE_0Knw10g_7YNjl4cM';
const ADMIN_EMAIL='giovancarlos68@gmail.com';
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
let rows=[];
let pendingEmail='';
let sending=false;
let verifying=false;

async function isAdmin(){
  const {data:{user}}=await db.auth.getUser();
  if(!user || (user.email||'').toLowerCase()!==ADMIN_EMAIL) return false;
  const {data,error}=await db.from('casting_admins').select('user_id').eq('user_id',user.id).eq('ativo',true).maybeSingle();
  return !error && !!data;
}

function setStatus(msg,type=''){const el=$('loginStatus');el.textContent=msg;el.className='status '+type}
function showLogin(){
  $('loginBox').classList.remove('hidden');
  $('dashboardBox').classList.add('hidden');
  $('logout').classList.add('hidden');
  $('emailStep').classList.remove('hidden');
  $('codeStep').classList.add('hidden');
  $('email').focus();
  pendingEmail='';
}
function showCodeStep(){
  $('emailStep').classList.add('hidden');
  $('codeStep').classList.remove('hidden');
  $('code').value='';
  $('code').focus();
}
function showDash(){
  $('loginBox').classList.add('hidden');
  $('dashboardBox').classList.remove('hidden');
  $('logout').classList.remove('hidden');
  load();
}

async function init(){
  const {data:{session}}=await db.auth.getSession();
  if(session){
    if(await isAdmin()) showDash();
    else { await db.auth.signOut(); showLogin(); setStatus('Este e-mail não tem autorização de administrador.','error'); }
  }else showLogin();

  db.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT') showLogin();
    // Não resetamos a tela em INITIAL_SESSION durante o pedido do OTP.
    // O acesso é liberado somente após verifyOtp + verificação do admin.
    if(event==='SIGNED_IN' && session && !verifying){
      setTimeout(async()=>{
        if(await isAdmin()) showDash();
        else { await db.auth.signOut(); showLogin(); setStatus('Este e-mail não tem autorização de administrador.','error'); }
      },0);
    }
  });
}

async function sendCode(){
  if(sending) return;
  const email=$('email').value.trim().toLowerCase();
  if(email!==ADMIN_EMAIL){
    setStatus('Acesso recusado. Apenas o e-mail oficial do administrador é reconhecido.','error');
    return;
  }
  sending=true;
  const btn=$('sendCode');
  btn.disabled=true; btn.textContent='A enviar código…';
  setStatus('A preparar o código de segurança…');

  const {error}=await db.auth.signInWithOtp({
    email:ADMIN_EMAIL,
    options:{shouldCreateUser:false}
  });

  sending=false; btn.disabled=false; btn.textContent='Enviar código →';
  if(error){
    console.error(error);
    setStatus(error.message||'Não foi possível enviar o código.','error');
    return;
  }
  pendingEmail=ADMIN_EMAIL;
  showCodeStep();
  setStatus('');
  $('loginStatus').textContent='Código enviado para '+ADMIN_EMAIL+'. Verifica a caixa de entrada e introduz o código de 6 dígitos.';
  $('loginStatus').className='status success';
}

async function verifyCode(){
  if(verifying) return;
  const token=$('code').value.trim().replace(/\D/g,'');
  if(!/^\d{6}$/.test(token)){
    setStatus('Introduz o código de 6 dígitos recebido no e-mail.','error');
    return;
  }
  verifying=true;
  const btn=$('verifyCode');
  btn.disabled=true; btn.textContent='A verificar…';
  setStatus('A verificar o código…');

  const {data,error}=await db.auth.verifyOtp({email:pendingEmail,token,type:'email'});
  if(error){
    console.error(error);
    verifying=false; btn.disabled=false; btn.textContent='Confirmar código →';
    setStatus(error.message||'Código inválido ou expirado.','error');
    return;
  }

  const ok=await isAdmin();
  verifying=false; btn.disabled=false; btn.textContent='Confirmar código →';
  if(!ok){
    await db.auth.signOut();
    showLogin();
    setStatus('Acesso negado. Este e-mail não é um administrador do FC Malanjino.','error');
    return;
  }
  showDash();
}

async function resendCode(){
  if(!pendingEmail){showLogin();return}
  $('resendCode').disabled=true;
  setStatus('A enviar um novo código…');
  const {error}=await db.auth.signInWithOtp({email:ADMIN_EMAIL,options:{shouldCreateUser:false}});
  $('resendCode').disabled=false;
  if(error){setStatus(error.message||'Não foi possível reenviar o código.','error');return}
  $('code').value='';
  $('code').focus();
  setStatus('Novo código enviado para '+ADMIN_EMAIL+'.','success');
}

$('emailForm')?.addEventListener('submit',e=>{e.preventDefault();sendCode()});
$('codeForm')?.addEventListener('submit',e=>{e.preventDefault();verifyCode()});
$('resendCode')?.addEventListener('click',resendCode);
$('changeEmail')?.addEventListener('click',()=>{showLogin();setStatus('');});
$('logout')?.addEventListener('click',async()=>{await db.auth.signOut();showLogin()});
$('refresh')?.addEventListener('click',load);
$('search')?.addEventListener('input',draw);
$('position')?.addEventListener('change',draw);
$('state')?.addEventListener('change',draw);

async function load(){
  const {data,error}=await db.from('casting_candidatos').select('*').order('criado_em',{ascending:false});
  if(error){$('candidateList').innerHTML='<div class="empty">Sem acesso às candidaturas. Verifica a autorização administrativa.</div>';return}
  rows=data||[];
  $('total').textContent=rows.length;
  $('review').textContent=rows.filter(x=>x.estado==='em_analise').length;
  $('called').textContent=rows.filter(x=>x.estado==='convocado').length;
  $('approved').textContent=rows.filter(x=>x.estado==='aprovado').length;
  draw();
}
function draw(){
  const q=($('search').value||'').toLowerCase(),p=$('position').value,s=$('state').value;
  const f=rows.filter(x=>(!q||`${x.nome_completo} ${x.telefone} ${x.email||''}`.toLowerCase().includes(q))&&(!p||x.posicao_principal===p)&&(!s||x.estado===s));
  $('candidateList').innerHTML=f.length?f.map(card).join(''):'<div class="empty">Nenhuma candidatura encontrada.</div>';
}
function card(x){return `<article class="candidate"><div class="candidate-main"><h3>${esc(x.nome_completo)}</h3><p>${esc(x.posicao_principal)}${x.posicao_secundaria?' · '+esc(x.posicao_secundaria):''} · ${esc(x.provincia||'')}</p><small>${esc(x.telefone)}${x.email?' · '+esc(x.email):''}${x.altura_cm?' · '+x.altura_cm+' cm':''}</small><div class="candidate-details"><span>Experiência: ${esc(x.experiencia||'Não indicada')}</span><span>Clubes: ${esc(x.clubes_anteriores||'Não indicados')}</span>${x.video_url?`<a href="${esc(x.video_url)}" target="_blank" rel="noopener">Ver vídeo</a>`:''}</div></div><div class="candidate-actions"><span class="badge ${x.estado}">${label(x.estado)}</span><button class="accept" onclick="setState('${x.id}','aprovado')">✓ Aceitar</button><button class="reject" onclick="setState('${x.id}','nao_aprovado')">✕ Recusar</button><button class="wait" onclick="setState('${x.id}','lista_espera')">Lista de espera</button></div></article>`}
window.setState=async(id,state)=>{const {error}=await db.from('casting_candidatos').update({estado:state}).eq('id',id);if(error){alert('Não foi possível atualizar a candidatura.');return}await load()};
function label(s){return ({em_analise:'Em análise',convocado:'Convocado',aprovado:'Aprovado',lista_espera:'Lista de espera',nao_aprovado:'Não aprovado'})[s]||s}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
init();
