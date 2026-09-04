const CFG = window.ECG_CONFIG || {};
const configured = !!(CFG.SUPABASE_URL && CFG.SUPABASE_PUBLISHABLE_KEY && !CFG.SUPABASE_URL.includes('SEU-PROJETO') && !CFG.SUPABASE_PUBLISHABLE_KEY.includes('SUA-'));
let sb = null;


async function loadSupabaseSDK(){
  if(!configured) return null;
  if(window.supabase) return window.supabase;
  await new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload=resolve;
    script.onerror=()=>reject(new Error('Não foi possível carregar o SDK do Supabase.'));
    document.head.appendChild(script);
  });
  return window.supabase;
}

const state = {
  user: null,
  profile: null,
  demo: false,
  page: 'dashboard',
  selectedAnswer: null,
  currentQuestion: 0,
  sim: null,
  simIndex: 0,
  simScore: 0,
  simAttemptId: null,
  simSaved: false,
  ecgCases: [],
  questions: [],
  realCases: [],
  realQuestions: [],
  realCategories: [],
  libraryError: null,
  selectedCategory: 'all',
  viewer: null,
  studyModuleKey: null,
  studyLessonKey: null,
  studyCaseId: null,
  adaptive: {
    currentId: null,
    ability: 1,
    answered: 0,
    correct: 0,
    streak: 0,
    seen: [],
    recentCategories: [],
    categoryStats: {},
    answeredCurrent: false
  }
};

const demoCases = [];
const demoQuestions = [];

function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__tt);window.__tt=setTimeout(()=>t.classList.remove('show'),2200)}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function initials(name){return (name||'U').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function caseById(id){return state.ecgCases.find(x=>x.id===id) || null}
function trainingQuestions(){return state.questions}
function adaptiveMaxDifficulty(){return Math.max(1,...state.questions.map(q=>Number(q.difficulty||caseById(q.ecg_case_id)?.difficulty||1)))}
function adaptiveDifficulty(q){return Number(q.difficulty||caseById(q.ecg_case_id)?.difficulty||1)}
function adaptiveReset(){
  state.adaptive={currentId:null,ability:1,answered:0,correct:0,streak:0,seen:[],recentCategories:[],categoryStats:{},answeredCurrent:false};
  state.selectedAnswer=null;
}
function weightedPick(items, weightFn){
  if(!items.length)return null;
  const weights=items.map(x=>Math.max(.001,weightFn(x)));
  const total=weights.reduce((a,b)=>a+b,0);let r=Math.random()*total;
  for(let i=0;i<items.length;i++){r-=weights[i];if(r<=0)return items[i]}
  return items[items.length-1];
}
function chooseAdaptiveQuestion(){
  const a=state.adaptive;
  const all=trainingQuestions();
  if(!all.length)return null;
  const maxD=adaptiveMaxDifficulty();
  const target=clamp(Math.round(a.ability),1,maxD);
  let pool=all.filter(q=>!a.seen.includes(q.id));
  if(a.answered<3){const easy=pool.filter(q=>adaptiveDifficulty(q)===1);if(easy.length)pool=easy;}
  if(!pool.length){
    const keep=a.seen.slice(-Math.min(18,a.seen.length));
    a.seen=keep;
    pool=all.filter(q=>!keep.includes(q.id));
    if(!pool.length)pool=[...all];
  }
  const recentCats=a.recentCategories.slice(-2);
  const diverse=pool.filter(q=>!recentCats.includes(q.category));
  if(diverse.length>=Math.min(5,pool.length))pool=diverse;
  const near=pool.filter(q=>Math.abs(adaptiveDifficulty(q)-target)<=1);
  if(near.length)pool=near;
  const pick=weightedPick(pool,q=>{
    const d=adaptiveDifficulty(q);const dist=Math.abs(d-target);
    let w=dist===0?8:dist===1?3:.7;
    const s=a.categoryStats[q.category]||{right:0,total:0};
    if(s.total===0)w*=1.35;
    else{const acc=s.right/s.total;if(acc<.6)w*=1.75;else if(acc<.8)w*=1.25;else if(acc>.9)w*=.8;}
    if(a.recentCategories.at(-1)===q.category)w*=.15;
    return w;
  });
  if(pick){a.currentId=pick.id;a.answeredCurrent=false;state.selectedAnswer=null;}
  return pick;
}
function currentAdaptiveQuestion(){
  const a=state.adaptive;
  let q=state.questions.find(x=>x.id===a.currentId)||null;
  if(!q)q=chooseAdaptiveQuestion();
  return q;
}
function recordAdaptiveResult(q,correct){
  const a=state.adaptive;const d=adaptiveDifficulty(q);const maxD=adaptiveMaxDifficulty();
  a.answered++; if(correct){a.correct++;a.streak++;}else a.streak=0;
  a.seen.push(q.id);if(a.seen.length>80)a.seen=a.seen.slice(-80);
  a.recentCategories.push(q.category||'');if(a.recentCategories.length>5)a.recentCategories.shift();
  const s=a.categoryStats[q.category]||(a.categoryStats[q.category]={right:0,total:0});s.total++;if(correct)s.right++;
  const expected=1/(1+Math.exp((d-a.ability)*1.45));
  const k=a.answered<6?.72:.55;
  a.ability=clamp(a.ability+k*((correct?1:0)-expected),1,maxD);
  a.answeredCurrent=true;
}
function adaptiveLevelLabel(){
  const d=clamp(Math.round(state.adaptive.ability),1,adaptiveMaxDifficulty());
  return d===1?'Fundamental':d===2?'Básico':d===3?'Intermediário':d===4?'Avançado':'Especialista';
}


function createViewerState(){
  return {zoom:1,offsetX:0,offsetY:0,imageUrl:'',mobile:false};
}
function getViewer(){if(!state.viewer)state.viewer=createViewerState();return state.viewer}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function viewerBaseZoom(){return window.innerWidth<=720?2.15:1.25}
function resetViewer(){const v=getViewer();v.zoom=viewerBaseZoom();v.offsetX=0;v.offsetY=0;syncViewerUI();applyViewerTransform()}
function syncViewerUI(){const v=getViewer();const z=document.getElementById('zoomLevel');if(z)z.textContent=`${Math.round(v.zoom*100)}%`}
function applyViewerTransform(){
  const img=document.getElementById('ecgVectorImage');
  if(!img)return;
  const v=getViewer();
  img.style.transform=`translate(${v.offsetX}px, ${v.offsetY}px) scale(${v.zoom})`;
  syncViewerUI();
}
function bindECGViewer(ecg){
  const v=getViewer();
  const img=document.getElementById('ecgVectorImage');
  const wrap=document.getElementById('ecgWrap');
  if(!img||!wrap)return;
  v.imageUrl=ecg.image_url||'';
  v.zoom=viewerBaseZoom();v.offsetX=0;v.offsetY=0;
  img.onload=()=>{wrap.classList.remove('image-failed');applyViewerTransform()};
  img.onerror=()=>{wrap.classList.add('image-failed');toast('Não foi possível carregar o traçado vetorial.')};
  applyViewerTransform();

  const zoomBy=(delta)=>{v.zoom=clamp(Number((v.zoom+delta).toFixed(2)),1,8);applyViewerTransform()};
  document.getElementById('zoomInBtn')?.addEventListener('click',()=>zoomBy(.3));
  document.getElementById('zoomOutBtn')?.addEventListener('click',()=>zoomBy(-.3));
  document.getElementById('fitBtn')?.addEventListener('click',resetViewer);
  document.getElementById('fullscreenBtn')?.addEventListener('click',async()=>{
    if(document.fullscreenElement)await document.exitFullscreen();
    else if(wrap.requestFullscreen)await wrap.requestFullscreen();
  });
  wrap.onwheel=(e)=>{e.preventDefault();zoomBy(e.deltaY<0?.22:-.22)};

  let dragging=false,lastX=0,lastY=0;
  const start=(x,y)=>{dragging=true;lastX=x;lastY=y;wrap.classList.add('dragging')};
  const move=(x,y)=>{if(!dragging)return;v.offsetX+=x-lastX;v.offsetY+=y-lastY;lastX=x;lastY=y;applyViewerTransform()};
  const end=()=>{dragging=false;wrap.classList.remove('dragging')};
  wrap.onmousedown=e=>{if(e.button===0)start(e.clientX,e.clientY)};
  wrap.onmousemove=e=>move(e.clientX,e.clientY);
  wrap.onmouseup=end;wrap.onmouseleave=end;
  wrap.ondblclick=()=>{v.zoom=v.zoom>viewerBaseZoom()+.2?viewerBaseZoom():Math.min(3.2,v.zoom+1);v.offsetX=0;v.offsetY=0;applyViewerTransform()};
  wrap.ontouchstart=e=>{const t=e.touches[0];if(t)start(t.clientX,t.clientY)};
  wrap.ontouchmove=e=>{const t=e.touches[0];if(t){e.preventDefault();move(t.clientX,t.clientY)} };
  wrap.ontouchend=end;

  if(!window.__ecgVectorResize){
    window.addEventListener('resize',()=>{if(document.getElementById('ecgVectorImage'))resetViewer()});
    document.addEventListener('fullscreenchange',()=>{if(document.getElementById('ecgVectorImage'))setTimeout(resetViewer,80)});
    window.__ecgVectorResize=true;
  }
}


function studyData(){return window.ECG_STUDY_CONTENT||{modules:[],lessons:{}}}
function studyLesson(key){return studyData().lessons?.[key]||null}
function studyCasesCount(keys=[]){return keys.reduce((n,k)=>n+(studyLesson(k)?.cases?.length||0),0)}
function studyReset(){state.studyModuleKey=null;state.studyLessonKey=null;state.studyCaseId=null}
function difficultyDots(n=1){return `<span class="study-difficulty">${Array.from({length:5},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}</span>`}
function renderStudyHome(el){
  const data=studyData();
  el.innerHTML=`<article class="card section study-hero"><div><span class="eyebrow">Trilha 100% liberada</span><h2>Estude na ordem que fizer sentido para você.</h2><p>Todo o conteúdo está disponível desde o início. Cada aula combina resumo autoral, critérios de ECG, armadilhas, referências, vídeos externos e estudos de caso.</p></div><div class="study-kpis"><div><strong>${data.modules.length}</strong><span>módulos</span></div><div><strong>${Object.keys(data.lessons||{}).length}</strong><span>aulas</span></div><div><strong>${Object.values(data.lessons||{}).reduce((a,l)=>a+(l.cases?.length||0),0)}</strong><span>casos clínicos</span></div></div></article><div class="grid module-grid study-module-grid">${data.modules.map(m=>{const lessons=m.lesson_keys||[];const caseCount=studyCasesCount(lessons);return `<article class="card module study-module"><div class="study-module-top"><span class="badge">Nível ${m.level}</span><span class="unlocked">✓ liberado</span></div><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p><div class="study-module-meta"><span>${lessons.length} aulas</span>${caseCount?`<span>${caseCount} casos</span>`:''}</div><footer><span></span><button data-study-module="${esc(m.key)}">Explorar →</button></footer></article>`}).join('')}</div><article class="card section copyright-note"><strong>Uso de fontes e direitos autorais</strong><p>${esc(data.copyright_note||'')}</p></article>`;
  el.querySelectorAll('[data-study-module]').forEach(b=>b.onclick=()=>{state.studyModuleKey=b.dataset.studyModule;state.studyLessonKey=null;state.studyCaseId=null;renderTrail();window.scrollTo({top:0,behavior:'smooth'})});
}
function renderStudyModule(el,moduleKey){
  const data=studyData();const m=data.modules.find(x=>x.key===moduleKey);if(!m){studyReset();return renderStudyHome(el)}
  const keys=m.lesson_keys||[];
  el.innerHTML=`<div class="study-breadcrumb"><button class="btn btn-ghost" id="studyBackHome">← Trilha</button><div><span class="eyebrow">Nível ${m.level}</span><h2>${esc(m.title)}</h2><p>${esc(m.description)}</p></div></div><div class="study-lesson-list">${keys.map(k=>{const l=studyLesson(k);if(!l)return'';return `<article class="card study-lesson-card"><div class="study-lesson-index">${String(keys.indexOf(k)+1).padStart(2,'0')}</div><div class="study-lesson-body"><div class="study-lesson-title"><h3>${esc(l.title)}</h3><span class="unlocked">✓ livre</span></div><p>${esc(l.summary)}</p><div class="lesson-tags"><span>Nível ${l.level}</span><span>${l.videos?.length||0} vídeo(s)</span>${l.cases?.length?`<span>${l.cases.length} casos</span>`:''}</div></div><button class="btn btn-primary" data-study-lesson="${esc(k)}">Abrir aula</button></article>`}).join('')}</div>`;
  document.getElementById('studyBackHome').onclick=()=>{studyReset();renderTrail()};
  el.querySelectorAll('[data-study-lesson]').forEach(b=>b.onclick=()=>{state.studyLessonKey=b.dataset.studyLesson;state.studyCaseId=null;renderTrail();window.scrollTo({top:0,behavior:'smooth'})});
}
function renderStudyLesson(el,key){
  const l=studyLesson(key);if(!l){state.studyLessonKey=null;return renderStudyModule(el,state.studyModuleKey)}
  const sections=(l.sections||[]).map(s=>`<div class="study-section-block"><h4>${esc(s[0])}</h4><ul>${(s[1]||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
  const videos=(l.videos||[]).map(v=>`<article class="study-video-card"><div class="video-icon">▶</div><div><small>${esc(v.channel)}</small><h4>${esc(v.title)}</h4><p>${esc(v.note)}</p><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">Assistir no YouTube ↗</a></div></article>`).join('');
  const refs=(l.references||[]).map(r=>`<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)} ↗</a></li>`).join('');
  const cases=(l.cases||[]).map((c,i)=>`<article class="card clinical-case-card"><div class="case-card-top"><span class="badge">Caso ${i+1}</span>${difficultyDots(c.difficulty)}</div><h4>${esc(c.title)}</h4><p>${esc(c.chief_complaint)}</p><button class="btn btn-secondary full" data-study-case="${esc(c.id)}">Abrir estudo de caso</button></article>`).join('');
  el.innerHTML=`<div class="study-breadcrumb"><button class="btn btn-ghost" id="studyBackModule">← Voltar</button><div><span class="eyebrow">Nível ${l.level} • conteúdo liberado</span><h2>${esc(l.title)}</h2><p>${esc(l.summary)}</p></div></div><div class="study-detail-grid"><main><article class="card section"><h3>Objetivos de aprendizagem</h3><ul class="study-objectives">${(l.objectives||[]).map(x=>`<li>✓ ${esc(x)}</li>`).join('')}</ul>${sections}</article><article class="card section study-pitfalls"><h3>Pegadinhas e erros comuns</h3><ul>${(l.pitfalls||[]).map(x=>`<li>⚠ ${esc(x)}</li>`).join('')}</ul></article></main><aside><article class="card section"><h3>Vídeos selecionados</h3><p class="muted study-source-note">Os vídeos não são hospedados pelo ECG Lab. Os botões abrem o conteúdo no canal original, preservando autoria e atribuição.</p><div class="study-video-list">${videos||'<p class="muted">Nenhum vídeo externo nesta aula.</p>'}</div></article><article class="card section"><h3>Referências</h3><p class="muted study-source-note">O texto da aula é uma síntese autoral. Estas fontes são indicadas para aprofundamento e verificação.</p><ul class="study-reference-list">${refs||'<li>Conteúdo autoral do ECG Lab.</li>'}</ul></article></aside></div>${l.cases?.length?`<article class="card section cases-section"><div class="section-head"><div><h3>10 estudos de caso deste ritmo</h3><p class="muted">Anamnese, sinais vitais, exames, imagem/ECG e uma pegadinha leve em cada cenário.</p></div><span class="badge">${l.cases.length} casos</span></div><div class="clinical-cases-grid">${cases}</div></article>`:''}`;
  document.getElementById('studyBackModule').onclick=()=>{state.studyLessonKey=null;state.studyCaseId=null;renderTrail()};
  el.querySelectorAll('[data-study-case]').forEach(b=>b.onclick=()=>{state.studyCaseId=b.dataset.studyCase;renderStudyCase(el,l,state.studyCaseId);window.scrollTo({top:0,behavior:'smooth'})});
}
function renderStudyCase(el,lesson,id){
  const c=(lesson.cases||[]).find(x=>x.id===id);if(!c){state.studyCaseId=null;return renderStudyLesson(el,lesson.key)}
  el.innerHTML=`<div class="study-breadcrumb"><button class="btn btn-ghost" id="caseBack">← ${esc(lesson.title)}</button><div><span class="eyebrow">Caso clínico • nível ${c.difficulty}</span><h2>${esc(c.title)}</h2><p>${esc(c.chief_complaint)}</p></div></div><div class="case-layout"><main><article class="card case-ecg-card"><div class="case-ecg-head"><div><strong>ECG do caso</strong><small>Lead II • traçado educacional vetorial</small></div><span class="badge">Sem resposta visível</span></div><img src="${esc(c.ecg_image)}" alt="ECG educacional do caso ${esc(c.title)}" class="case-ecg-image"></article><article class="card section"><h3>Anamnese e contexto</h3><div class="case-info-grid"><div><small>Queixa principal</small><p>${esc(c.chief_complaint)}</p></div><div><small>História</small><p>${esc(c.anamnesis)}</p></div><div><small>Medicações</small><p>${esc(c.medications)}</p></div><div><small>Sinais vitais</small><p>${esc(c.vitals)}</p></div></div><h4>Exame físico</h4><ul>${(c.physical_exam||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></article><article class="card section"><h3>Exames complementares</h3><div class="case-info-grid"><div><small>Laboratório</small><ul>${(c.labs||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><small>Imagem / outros exames</small><p>${esc(c.imaging)}</p></div></div></article></main><aside><article class="card section case-question"><span class="eyebrow">Raciocínio</span><h3>${esc(c.question)}</h3><p>Analise o ECG antes de revelar a discussão. A resposta foi escondida para evitar reconhecimento por memória.</p><button class="btn btn-primary full" id="revealCase">Revelar análise</button><div class="case-answer hidden" id="caseAnswer"><h4>${esc(c.answer)}</h4><p>${esc(c.reasoning)}</p><div class="case-trap"><strong>Pegadinha leve</strong><p>${esc(c.trap)}</p></div><div class="case-pearl"><strong>Ponto de aprendizagem</strong><p>${esc(c.learning_point)}</p></div></div></article><article class="card section"><strong>Nota educacional</strong><p class="muted">Caso fictício criado para treinamento. Não representa paciente real e não substitui avaliação clínica, protocolo institucional ou julgamento profissional.</p></article></aside></div>`;
  document.getElementById('caseBack').onclick=()=>{state.studyCaseId=null;renderStudyLesson(el,lesson.key)};
  document.getElementById('revealCase').onclick=e=>{document.getElementById('caseAnswer').classList.remove('hidden');e.currentTarget.disabled=true;e.currentTarget.textContent='Análise revelada'};
}
function shell(){
  const admin = state.profile?.role === 'admin';
  document.body.classList.toggle('is-admin', admin);
  const nm = state.profile?.full_name || state.user?.user_metadata?.full_name || state.user?.email?.split('@')[0] || 'Visitante';
  const email = state.user?.email || (state.demo?'demo@ecglab.app':'não autenticado');
  document.getElementById('app').innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">♥</div><div><strong>ECG Lab</strong><small>Treine. Entenda. Domine.</small></div></div>
      <nav class="nav">
        ${navButton('dashboard','⌂','Dashboard')}
        ${navButton('treinar','⌁','Treinar ECG')}
        ${navButton('trilha','▤','Trilha de estudo')}
        ${navButton('simulados','◫','Simulados')}
        ${navButton('desempenho','↗','Meu Desempenho')}
        ${navButton('tutor','✦','Tutor IA')}
        ${admin?navButton('admin','⚙','Admin','admin-only'):''}
      </nav>
      <div class="sidebar-footer"><div class="mini-profile"><div class="avatar">${esc(initials(nm))}</div><div><strong>${esc(nm)}</strong><small>${esc(email)}</small></div></div></div>
    </aside>
    <main class="main">
      <div class="topbar"><div><h1 id="pageTitle">ECG Lab</h1><p id="pageSubtitle">Treinamento estruturado de eletrocardiografia.</p></div><div class="actions"><button class="btn btn-secondary hide-mobile" data-page="treinar">Treino rápido</button>${state.user||state.demo?`<button class="btn btn-ghost" id="logoutBtn">Sair</button>`:`<button class="btn btn-primary" id="openLogin">Entrar</button>`}</div></div>
      <section id="dashboard" class="page"></section><section id="treinar" class="page"></section><section id="trilha" class="page"></section><section id="simulados" class="page"></section><section id="desempenho" class="page"></section><section id="tutor" class="page"></section>${admin?'<section id="admin" class="page"></section>':''}
    </main>
    <nav class="mobile-nav">${mobileNav('dashboard','⌂','Início')}${mobileNav('treinar','⌁','Treinar')}${mobileNav('trilha','▤','Trilha')}${mobileNav('simulados','◫','Simulado')}${mobileNav('desempenho','↗','Desempenho')}${mobileNav('tutor','✦','Tutor')}</nav>
  </div>`;
  wireShell();
  renderAll();
  showPage(state.page);
}
function navButton(id,icon,label,cls=''){return `<button class="${cls}" data-page="${id}"><b>${icon}</b><span>${label}</span></button>`}
function mobileNav(id,icon,label){return `<button data-page="${id}">${icon}<br><small>${label}</small></button>`}
function wireShell(){
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
  document.getElementById('openLogin')?.addEventListener('click',openAuth);
  document.getElementById('logoutBtn')?.addEventListener('click',logout);
}
function showPage(id){
  if(!document.getElementById(id)) id='dashboard'; state.page=id;
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));
  document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
  const meta={dashboard:['Dashboard','Seu progresso e próximos passos.'],treinar:['Treinar ECG','Interpretação guiada com feedback imediato.'],trilha:['Trilha de estudo','Do básico ao avançado em módulos progressivos.'],simulados:['Simulados','Avalie seu domínio com questões cronometradas.'],desempenho:['Meu Desempenho','Acompanhe sua evolução e transforme resultados em um plano de estudo.'],tutor:['Tutor IA','Tire dúvidas sobre conceitos e raciocínio eletrocardiográfico.'],admin:['Painel administrativo','Gerencie ECGs e conteúdo educacional.']};
  const m=meta[id]||meta.dashboard;document.getElementById('pageTitle').textContent=m[0];document.getElementById('pageSubtitle').textContent=m[1];
  if(id==='desempenho')window.ECG_PERFORMANCE?.activate?.();
  window.scrollTo({top:0,behavior:'smooth'});
}

function renderAll(){renderDashboard();renderTraining();renderTrail();renderSims();window.ECG_PERFORMANCE?.render?.();renderTutor();if(state.profile?.role==='admin')renderAdmin()}
function renderDashboard(){
  const el=document.getElementById('dashboard');
  el.innerHTML=`
  <article class="card hero"><div><span class="eyebrow">⚡ aprendizagem adaptativa</span><h2>Aprenda ECG interpretando de verdade.</h2><p>Analise frequência, ritmo, onda P, PR, QRS e ST em uma sequência lógica. Os exercícios usam traçados vetoriais reconstruídos do zero, com 6 variações por ritmo e nitidez em qualquer tamanho de tela.</p><div class="cta"><button class="btn btn-primary" data-page="treinar">Começar treino</button><button class="btn btn-ghost" data-page="simulados">Fazer simulado</button></div></div><div class="pulse"><div class="pulse-ring">♥</div></div></article>
  <div class="grid stats"><article class="card stat"><span class="label">Precisão</span><strong id="statAccuracy">84%</strong><small>acertos acumulados</small></article><article class="card stat"><span class="label">ECGs estudados</span><strong id="statCases">${state.ecgCases.length||'—'}</strong><small>traçados vetoriais disponíveis</small></article><article class="card stat"><span class="label">Revisões</span><strong>7</strong><small>itens recomendados</small></article><article class="card stat"><span class="label">XP</span><strong id="statXP">${state.demo?'3.480':'0'}</strong><small>progresso de estudo</small></article></div>
  <div class="grid two"><article class="card section"><div class="section-head"><h3>Continuar estudando</h3><span class="badge">trilha ativa</span></div><div class="list"><div class="list-item"><div class="list-num">07</div><div><h4>Fibrilação atrial</h4><p>Regularidade, atividade atrial e diferenciais</p></div><span class="badge">72%</span></div><div class="list-item"><div class="list-num">08</div><div><h4>Flutter atrial</h4><p>Ondas F e condução AV</p></div><span class="badge">56%</span></div><div class="list-item"><div class="list-num">09</div><div><h4>Bloqueios AV</h4><p>PR, condução e dissociação</p></div><span class="badge">58%</span></div></div></article><article class="card section"><div class="section-head"><h3>Mapa de habilidades</h3></div>${skill('Frequência',96)}${skill('Ritmo',91)}${skill('Onda P',83)}${skill('PR',74)}${skill('Bloqueios',58)}</article></div>`;
  el.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
  loadUserStats();
}
function skill(n,v){return `<div class="skill"><span>${n}</span><div class="progress"><i style="width:${v}%"></i></div><b>${v}%</b></div>`}

function renderTraining(){
  const el=document.getElementById('treinar');
  const q=currentAdaptiveQuestion();
  if(!q){
    el.innerHTML=`<article class="card section"><div class="empty"><h3>Biblioteca educacional indisponível</h3><p>${esc(state.libraryError||'Nenhuma questão foi carregada.')}</p></div></article>`;
    return;
  }
  const ecg=caseById(q.ecg_case_id);
  if(!ecg){state.adaptive.currentId=null;return renderTraining()}
  const a=state.adaptive;
  const maxD=adaptiveMaxDifficulty();
  const level=clamp(Math.round(a.ability),1,maxD);
  const accuracy=a.answered?Math.round(a.correct/a.answered*100):0;
  const opts=(q.options||[]).map((o,i)=>{const label=Array.isArray(o)?o[0]:o.label;return `<button class="answer" data-opt="${i}">${esc(label)}</button>`}).join('');
  const dots=Array.from({length:maxD},(_,i)=>`<i class="adaptive-dot ${i<level?'on':''}"></i>`).join('');
  const sourceLine=`<div class="ecg-source"><span><strong>Traçado educacional vetorial</strong></span><span>SVG em alta definição</span><span>O diagnóstico só é revelado após responder</span></div>`;
  el.innerHTML=`<div class="adaptive-panel card"><div class="adaptive-main"><div><span class="eyebrow">⚡ treino adaptativo</span><strong>${adaptiveLevelLabel()}</strong><small>Nível estimado ${level} de ${maxD}</small></div><div class="adaptive-dots">${dots}</div></div><div class="adaptive-stats"><span><b>${a.answered+1}</b> questão atual</span><span><b>${accuracy}%</b> precisão</span><span><b>${a.streak}</b> sequência</span><button class="btn btn-ghost" id="resetAdaptive">↻ Reiniciar treino</button></div></div><div class="training"><article class="card ecg-card"><div class="toolbar"><div><strong>ECG adaptativo #${a.answered+1}</strong><div class="muted" style="font-size:12px;margin-top:3px">Lead II • dificuldade selecionada automaticamente</div></div><div class="tools viewer-tools"><button class="chip" id="zoomOutBtn">－</button><button class="chip" id="zoomInBtn">＋</button><button class="chip" id="fitBtn">Ajustar</button><button class="chip" id="fullscreenBtn">⤢ Tela cheia</button><span class="chip zoom-indicator" id="zoomLevel">100%</span><button class="chip" id="hintChip">💡 Dica</button></div></div><div class="viewer-help">As questões são misturadas entre todos os ritmos. O algoritmo começa com casos fáceis e aumenta ou reduz a dificuldade conforme seus acertos, erros e áreas de maior dificuldade.</div><div class="ecg-wrap enhanced vector-viewer" id="ecgWrap"><img id="ecgVectorImage" src="${esc(ecg.image_url)}" alt="Traçado de ECG em Lead II para questão adaptativa"><div class="image-error-vector"><strong>Traçado indisponível.</strong><span>Recarregue a página.</span></div><div class="float-tag">Lead II • 10 s</div></div>${sourceLine}</article><aside class="card question"><span class="eyebrow">CAT • dificuldade ${adaptiveDifficulty(q)}/${maxD}</span><h2>${esc(q.prompt)}</h2><p>Analise o traçado antes de responder. Não é possível pular a questão; a próxima será escolhida com base neste resultado.</p><div class="answers" id="answers">${opts}</div><div class="feedback" id="feedback"><strong id="feedbackTitle"></strong><p id="feedbackText" style="margin-bottom:0"></p></div><div class="cta"><button class="btn btn-primary" id="confirmBtn">Confirmar</button><button class="btn btn-ghost" id="nextBtn" disabled>Próxima questão adaptativa</button></div></aside></div>`;
  document.querySelectorAll('.answer').forEach(b=>b.onclick=()=>{if(a.answeredCurrent)return;document.querySelectorAll('.answer').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');state.selectedAnswer=Number(b.dataset.opt)});
  document.getElementById('confirmBtn').onclick=()=>submitTrainingAnswer(q);
  document.getElementById('nextBtn').onclick=()=>{if(!a.answeredCurrent)return;chooseAdaptiveQuestion();renderTraining()};
  document.getElementById('resetAdaptive').onclick=()=>{adaptiveReset();renderTraining();toast('Treino adaptativo reiniciado no nível fácil.')};
  document.getElementById('hintChip').onclick=()=>{if(a.answeredCurrent)return;const f=document.getElementById('feedback');f.classList.add('show');document.getElementById('feedbackTitle').textContent='Dica de interpretação';document.getElementById('feedbackText').textContent='Comece por frequência e regularidade. Depois procure onda P, relação P:QRS e largura do QRS antes de escolher a alternativa.'};
  bindECGViewer(ecg);
}

async function submitTrainingAnswer(q){
  const a=state.adaptive;
  if(a.answeredCurrent){toast('Esta questão já foi respondida.');return}
  if(state.selectedAnswer===null){toast('Selecione uma alternativa.');return}
  const o=q.options[state.selectedAnswer];const correct=Array.isArray(o)?o[1]:o.is_correct;
  document.querySelectorAll('.answer').forEach((b,i)=>{const oo=q.options[i];const ok=Array.isArray(oo)?oo[1]:oo.is_correct;if(ok)b.classList.add('correct');if(i===state.selectedAnswer&&!correct)b.classList.add('wrong');b.disabled=true});
  recordAdaptiveResult(q,!!correct);
  const f=document.getElementById('feedback');f.classList.add('show');
  document.getElementById('feedbackTitle').textContent=correct?`✓ Correto — ${caseById(q.ecg_case_id)?.diagnosis||'resposta correta'}`:`Revise: ${caseById(q.ecg_case_id)?.diagnosis||'padrão correto'}`;
  document.getElementById('feedbackText').textContent=q.explanation||caseById(q.ecg_case_id)?.explanation||'Veja os achados estruturados antes de seguir.';
  const nb=document.getElementById('nextBtn');if(nb)nb.disabled=false;
  const cb=document.getElementById('confirmBtn');if(cb)cb.disabled=true;
  toast(correct?'Correto — dificuldade adaptada.':'Resposta registrada — o próximo item será ajustado.');
  if(sb && state.user && !state.demo){
    if(q.external){
      await sb.from('external_user_answers').insert({user_id:state.user.id,question_key:q.id,case_key:q.ecg_case_id,category:q.category||null,selected_option_index:state.selectedAnswer,is_correct:!!correct});
    }else{
      await sb.from('user_answers').insert({user_id:state.user.id,question_id:q.id,selected_option_index:state.selectedAnswer,is_correct:!!correct});
    }
    await updateProgress(correct);
  }
}

function renderTrail(){const el=document.getElementById('trilha');if(!el)return;if(state.studyCaseId&&state.studyLessonKey){const l=studyLesson(state.studyLessonKey);if(l)return renderStudyCase(el,l,state.studyCaseId)}if(state.studyLessonKey)return renderStudyLesson(el,state.studyLessonKey);if(state.studyModuleKey)return renderStudyModule(el,state.studyModuleKey);return renderStudyHome(el)}
function module(level,title,desc,count,status){return `<article class="card module"><span class="badge">${level}</span><h3>${title}</h3><p>${desc}</p><footer><span class="muted">${count} • ${status}</span><button data-page="treinar">Estudar →</button></footer></article>`}

function renderSims(){document.getElementById('simulados').innerHTML=`<div class="grid sim-grid"><article class="card sim-card"><span class="badge">Básico</span><h3>Fundamentos</h3><p>10 questões sobre ritmo, frequência, ondas e intervalos.</p><button class="btn btn-primary" data-start-sim="10">Começar</button></article><article class="card sim-card"><span class="badge">Intermediário</span><h3>Arritmias</h3><p>20 questões com diferenciação de ritmos e condução.</p><button class="btn btn-primary" data-start-sim="20">Começar</button></article><article class="card sim-card"><span class="badge">Completo</span><h3>Simulado geral</h3><p>30 questões misturando os principais módulos.</p><button class="btn btn-primary" data-start-sim="30">Começar</button></article></div><div id="simRunner" style="margin-top:16px"></div>`;document.querySelectorAll('[data-start-sim]').forEach(b=>b.onclick=()=>startSim(Number(b.dataset.startSim)))}
async function startSim(n){state.sim=[...state.questions].sort(()=>Math.random()-.5).slice(0,Math.min(n,state.questions.length));state.simIndex=0;state.simScore=0;state.simAttemptId=null;state.simSaved=false;if(sb&&state.user&&!state.demo){const {data}=await sb.from('simulation_attempts').insert({user_id:state.user.id,title:'Simulado ECG Lab',total_questions:state.sim.length,correct_answers:0}).select('id').single();state.simAttemptId=data?.id||null}renderSimQuestion()}
function renderSimQuestion(){const box=document.getElementById('simRunner');if(!state.sim||state.simIndex>=state.sim.length){saveSimResult();box.innerHTML=`<article class="card section"><h3>Resultado</h3><p class="muted">Você acertou <strong>${state.simScore}</strong> de <strong>${state.sim?.length||0}</strong> questões.</p><button class="btn btn-primary" onclick="startSim(${state.sim?.length||10})">Refazer</button></article>`;return}const q=state.sim[state.simIndex];box.innerHTML=`<article class="card question"><span class="eyebrow">${state.simIndex+1}/${state.sim.length}</span><h2>${esc(q.prompt)}</h2><div class="answers">${q.options.map((o,i)=>`<button class="answer" data-simopt="${i}">${esc(Array.isArray(o)?o[0]:o.label)}</button>`).join('')}</div><div class="feedback" id="simFeedback"><strong></strong><p style="margin-bottom:0"></p></div></article>`;document.querySelectorAll('[data-simopt]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.simopt),o=q.options[i],ok=Array.isArray(o)?o[1]:o.is_correct;if(ok)state.simScore++;document.querySelectorAll('[data-simopt]').forEach((x,ix)=>{const oo=q.options[ix],yes=Array.isArray(oo)?oo[1]:oo.is_correct;if(yes)x.classList.add('correct');if(ix===i&&!ok)x.classList.add('wrong');x.disabled=true});const f=document.getElementById('simFeedback');f.classList.add('show');f.querySelector('strong').textContent=ok?'✓ Correto':'Resposta incorreta';f.querySelector('p').textContent=q.explanation;setTimeout(()=>{state.simIndex++;renderSimQuestion()},1100)})}

async function saveSimResult(){if(state.simSaved||!state.simAttemptId||!sb||!state.user||state.demo)return;state.simSaved=true;await sb.from('simulation_attempts').update({correct_answers:state.simScore,finished_at:new Date().toISOString()}).eq('id',state.simAttemptId).eq('user_id',state.user.id)}

function renderTutor(){document.getElementById('tutor').innerHTML=`<div class="tutor-layout"><article class="card tutor-info"><span class="eyebrow">Tutor educacional</span><h2>CardioTutor IA</h2><p class="muted">Use o tutor para entender conceitos, comparar padrões e revisar o raciocínio. Ele não deve ser usado para diagnosticar ECGs de pacientes ou substituir avaliação profissional.</p><div class="list"><div class="list-item"><div class="list-num">1</div><div><h4>Explique um conceito</h4><p>“Como diferenciar FA de flutter?”</p></div></div><div class="list-item"><div class="list-num">2</div><div><h4>Revise um erro</h4><p>“Por que PR progressivo sugere Mobitz I?”</p></div></div></div></article><article class="card chat"><div class="chat-log" id="chatLog"><div class="msg bot">Olá! Posso explicar ECG passo a passo. Pergunte sobre ritmo, intervalos, bloqueios, arritmias ou interpretação sistemática.</div></div><div class="chat-compose"><textarea id="tutorInput" placeholder="Digite sua dúvida..."></textarea><button class="btn btn-primary" id="tutorSend">Enviar</button></div></article></div>`;document.getElementById('tutorSend').onclick=sendTutor}
async function sendTutor(){const inp=document.getElementById('tutorInput');const text=inp.value.trim();if(!text)return;appendMsg(text,'user');inp.value='';if(!sb||!state.user||state.demo){setTimeout(()=>appendMsg('Modo demonstração: conecte o Supabase e configure a Edge Function `ecg-tutor` para ativar respostas por IA. Enquanto isso, uma boa forma de raciocinar é começar por frequência, regularidade, onda P, PR, largura do QRS e alterações de ST-T.','bot'),300);return}try{const {data:{session}}=await sb.auth.getSession();const res=await fetch(`${CFG.SUPABASE_URL}/functions/v1/ecg-tutor`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({message:text})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Falha no tutor');appendMsg(data.reply||'Sem resposta.','bot')}catch(e){appendMsg('Não consegui acessar o tutor: '+e.message,'bot')}}
function appendMsg(text,who){const log=document.getElementById('chatLog');const d=document.createElement('div');d.className='msg '+who;d.textContent=text;log.appendChild(d);log.scrollTop=log.scrollHeight}

function renderAdmin(){const el=document.getElementById('admin');if(!el)return;el.innerHTML=`<div class="admin-grid"><article class="card form-card"><span class="eyebrow">Novo conteúdo</span><h3>Cadastrar ECG</h3><form id="ecgForm"><div class="field"><label>Título</label><input id="caseTitle" required></div><div class="field"><label>Dificuldade</label><select id="caseDifficulty"><option value="1">1 — iniciante</option><option value="2">2 — básico</option><option value="3">3 — intermediário</option><option value="4">4 — avançado</option><option value="5">5 — especialista</option></select></div><div class="field"><label>Diagnóstico / interpretação</label><input id="caseDiagnosis" required></div><div class="field"><label>Imagem do ECG</label><input id="caseFile" type="file" accept="image/png,image/jpeg,image/webp"><small class="muted">Ou informe uma URL abaixo.</small></div><div class="field"><label>URL da imagem (opcional)</label><input id="caseImage" placeholder="https://..."></div><div class="field"><label>Explicação</label><textarea id="caseExplanation"></textarea></div><button class="btn btn-primary full">Salvar ECG</button></form></article><article class="card section"><div class="section-head"><h3>Conteúdo cadastrado</h3><span class="badge">${state.ecgCases.length} casos</span></div><div style="overflow:auto"><table class="admin-table"><thead><tr><th>Título</th><th>Dificuldade</th><th>Interpretação</th><th>Status</th></tr></thead><tbody>${state.ecgCases.map(c=>`<tr><td>${esc(c.title)}</td><td>${c.difficulty}/5</td><td>${esc(c.diagnosis||c.interpretation||'—')}</td><td>${esc(c.status||'published')}</td></tr>`).join('')}</tbody></table></div></article></div><article class="card form-card" style="margin-top:16px"><h3>Cadastrar questão</h3><form id="questionForm"><div class="field"><label>ECG</label><select id="questionCase">${state.ecgCases.map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join('')}</select></div><div class="field"><label>Pergunta</label><input id="questionPrompt" required></div><div class="field"><label>Alternativas (uma por linha; prefixe a correta com *)</label><textarea id="questionOptions" placeholder="Regular\n*Irregularmente irregular\nRegularmente irregular"></textarea></div><div class="field"><label>Explicação</label><textarea id="questionExplanation"></textarea></div><button class="btn btn-primary">Salvar questão</button></form></article>`;document.getElementById('ecgForm').onsubmit=saveCase;document.getElementById('questionForm').onsubmit=saveQuestion}
async function saveCase(e){e.preventDefault();if(!sb||state.demo){toast('No modo demo, cadastros não são persistidos.');return}let imageUrl=document.getElementById('caseImage').value||null;const file=document.getElementById('caseFile').files?.[0];if(file){const ext=(file.name.split('.').pop()||'png').toLowerCase();const path=`${crypto.randomUUID()}.${ext}`;const {error:upErr}=await sb.storage.from('ecgs').upload(path,file,{upsert:false});if(upErr)return toast('Upload: '+upErr.message);imageUrl=sb.storage.from('ecgs').getPublicUrl(path).data.publicUrl}const payload={title:document.getElementById('caseTitle').value,difficulty:Number(document.getElementById('caseDifficulty').value),diagnosis:document.getElementById('caseDiagnosis').value,image_url:imageUrl,explanation:document.getElementById('caseExplanation').value,status:'published',created_by:state.user.id};const {error}=await sb.from('ecg_cases').insert(payload);if(error)return toast(error.message);toast('ECG cadastrado.');await loadContent();renderAll();showPage('admin')}
async function saveQuestion(e){e.preventDefault();if(!sb||state.demo){toast('No modo demo, cadastros não são persistidos.');return}const lines=document.getElementById('questionOptions').value.split('\n').map(s=>s.trim()).filter(Boolean);if(lines.length<2)return toast('Informe ao menos duas alternativas.');const qPayload={ecg_case_id:document.getElementById('questionCase').value,prompt:document.getElementById('questionPrompt').value,explanation:document.getElementById('questionExplanation').value,status:'published',created_by:state.user.id};const {data:q,error}=await sb.from('questions').insert(qPayload).select().single();if(error)return toast(error.message);const opts=lines.map((s,i)=>({question_id:q.id,label:s.replace(/^\*/,''),is_correct:s.startsWith('*'),sort_order:i}));const {error:oe}=await sb.from('answer_options').insert(opts);if(oe)return toast(oe.message);toast('Questão cadastrada.');await loadContent();renderAll();showPage('admin')}

async function loadRealLibrary(){
  if(!window.ECG_REAL_LIBRARY){state.libraryError='Módulo da biblioteca educacional não foi carregado.';return}
  try{
    const lib=await window.ECG_REAL_LIBRARY.load();
    state.realCases=lib.cases||[];
    state.realQuestions=lib.questions||[];
    state.realCategories=lib.categories||[];
    state.libraryError=null;
  }catch(e){
    console.error('ECG vector library:',e);
    state.realCases=[];state.realQuestions=[];state.realCategories=[];
    state.libraryError='Falha ao carregar a biblioteca vetorial: '+e.message;
  }
}

async function loadContent(){
  if(!state.realCases.length && !state.libraryError) await loadRealLibrary();
  if(!sb){state.ecgCases=[...state.realCases];state.questions=[...state.realQuestions];return}
  const {data:cases,error:ce}=await sb.from('ecg_cases').select('*').eq('status','published').order('created_at',{ascending:false});
  const {data:qs,error:qe}=await sb.from('questions').select('id,ecg_case_id,prompt,explanation,answer_options(label,is_correct,sort_order)').eq('status','published');
  if(ce||qe){console.warn(ce||qe);state.ecgCases=[...state.realCases];state.questions=[...state.realQuestions];return}
  const dbCases=cases||[];
  const dbQuestions=(qs||[]).map(q=>({...q,options:(q.answer_options||[]).sort((a,b)=>a.sort_order-b.sort_order)}));
  state.ecgCases=[...state.realCases,...dbCases];
  state.questions=[...state.realQuestions,...dbQuestions];
}
async function loadUserStats(){if(!sb||!state.user||state.demo)return;const {data}=await sb.from('user_progress').select('*').eq('user_id',state.user.id).maybeSingle();if(!data)return;const total=data.total_answers||0,correct=data.correct_answers||0;const acc=total?Math.round(correct/total*100):0;document.getElementById('statAccuracy').textContent=acc+'%';document.getElementById('statXP').textContent=(data.xp||0).toLocaleString('pt-BR')}
async function updateProgress(correct){const {data}=await sb.from('user_progress').select('*').eq('user_id',state.user.id).maybeSingle();const p=data||{user_id:state.user.id,total_answers:0,correct_answers:0,xp:0,ecgs_completed:0};p.total_answers=(p.total_answers||0)+1;p.correct_answers=(p.correct_answers||0)+(correct?1:0);p.xp=(p.xp||0)+(correct?10:2);p.updated_at=new Date().toISOString();await sb.from('user_progress').upsert(p)}

// Auth
const modal=document.getElementById('authModal');let authMode='login';
function openAuth(){modal.classList.remove('hidden')}
function closeAuth(){modal.classList.add('hidden')}
document.querySelector('[data-close-modal]').onclick=closeAuth;
modal.addEventListener('click',e=>{if(e.target===modal)closeAuth()});
document.querySelectorAll('[data-auth-tab]').forEach(b=>b.onclick=()=>{authMode=b.dataset.authTab;document.querySelectorAll('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('nameField').classList.toggle('hidden',authMode!=='signup');document.getElementById('authSubmit').textContent=authMode==='signup'?'Criar conta':'Entrar'});
document.getElementById('demoLogin').onclick=async()=>{state.demo=true;state.user={id:'demo-user',email:'demo@ecglab.app',user_metadata:{full_name:'Usuário Demo'}};state.profile={id:'demo-user',full_name:'Usuário Demo',role:'student'};await loadContent();closeAuth();shell();toast('Modo demonstração ativado.')};
document.getElementById('authForm').onsubmit=async e=>{e.preventDefault();if(!sb)return toast('Configure o Supabase em config.js ou use o modo demonstração.');const email=document.getElementById('authEmail').value.trim(),password=document.getElementById('authPassword').value;if(authMode==='signup'){const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:document.getElementById('authName').value.trim()}}});if(error)return toast(error.message);toast(data.session?'Conta criada e conectada.':'Conta criada. Confirme o e-mail para entrar.');if(!data.session)return}else{const {error}=await sb.auth.signInWithPassword({email,password});if(error)return toast(error.message)}closeAuth()};
async function logout(){if(sb&&!state.demo)await sb.auth.signOut();state.user=null;state.profile=null;state.demo=false;state.page='dashboard';await loadContent();shell();toast('Sessão encerrada.')}
async function loadProfile(){if(!sb||!state.user)return;const {data}=await sb.from('profiles').select('*').eq('id',state.user.id).maybeSingle();state.profile=data||{id:state.user.id,full_name:state.user.user_metadata?.full_name||'',role:'student'}}

async function init(){
  document.getElementById('app').innerHTML='<div class="boot-loader"><div class="loader-heart">♥</div><strong>Carregando biblioteca de ECG...</strong><span>114 traçados vetoriais em alta definição</span></div>';
  await loadRealLibrary();
  state.ecgCases=[...state.realCases];state.questions=[...state.realQuestions];
  if(configured){
    try{const sdk=await loadSupabaseSDK();sb=sdk.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_PUBLISHABLE_KEY)}catch(e){console.warn(e.message);toast?.('Supabase indisponível; usando modo demonstração.')}
  }
  if(sb){const {data:{session}}=await sb.auth.getSession();if(session){state.user=session.user;await loadProfile();await loadContent()}sb.auth.onAuthStateChange(async(_event,session)=>{state.user=session?.user||null;state.demo=false;if(state.user){await loadProfile();await loadContent()}else state.profile=null;shell()})}
  shell();
  if(!state.user && CFG.ENABLE_DEMO_MODE!==false) setTimeout(openAuth,350);
}
init();
