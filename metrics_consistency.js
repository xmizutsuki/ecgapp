/* ECG Lab — canonical analytics/dashboard metrics.
   One source of truth for answered questions, accuracy, XP, study time,
   streaks and dashboard skill/review cards. In-progress practice-exam
   answers remain excluded from performance until the exam is completed. */
(function(){
  'use strict';

  const VERSION=1;
  const safe=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isEn=()=>window.ECG_LANG==='en';
  const perf=()=>window.ECG_PERFORMANCE||null;
  const appState=()=>typeof state!=='undefined'?state:null;
  const client=()=>typeof sb!=='undefined'?sb:null;
  const userId=()=>appState()?.user?.id||null;
  const hasCloud=()=>!!(client()&&appState()?.user&&!appState()?.demo);
  let syncTimer=null;
  let observer=null;
  let patching=false;

  const txt={
    pt:{
      eyebrow:'⚡ aprendizagem adaptativa',
      hero:'Aprenda ECG interpretando de verdade.',
      heroBody:'Analise frequência, ritmo, onda P, PR, QRS e ST em uma sequência lógica. Os exercícios usam traçados vetoriais reconstruídos do zero, com 6 variações por ritmo e nitidez em qualquer tamanho de tela.',
      start:'Começar treino',exam:'Fazer simulado',accuracy:'Precisão',accuracyNote:'acertos em atividades válidas',
      ecgs:'ECGs estudados',ecgsNote:'traçados únicos praticados',reviews:'Revisões',reviewsNote:'competências recomendadas',xp:'XP',xpNote:'engajamento de estudo',
      continue:'Continuar estudando',active:'recomendado',skillMap:'Mapa de habilidades',attempts:'tentativas',attempt:'tentativa',review:'Revisar esta competência',
      noData:'Complete atividades para gerar recomendações personalizadas.',notEnough:'Dados insuficientes',
    },
    en:{
      eyebrow:'⚡ adaptive learning',
      hero:'Learn ECG by actually interpreting it.',
      heroBody:'Analyze rate, rhythm, P wave, PR, QRS, and ST in a logical sequence. Exercises use vector tracings rebuilt from scratch, with 6 variations per rhythm and sharp rendering at any screen size.',
      start:'Start training',exam:'Take a practice exam',accuracy:'Accuracy',accuracyNote:'correct answers in eligible activities',
      ecgs:'ECGs studied',ecgsNote:'unique tracings practiced',reviews:'Reviews',reviewsNote:'recommended competencies',xp:'XP',xpNote:'study engagement',
      continue:'Continue studying',active:'recommended',skillMap:'Skill map',attempts:'attempts',attempt:'attempt',review:'Review this competency',
      noData:'Complete activities to generate personalized recommendations.',notEnough:'Not enough data',
    }
  };
  const L=()=>txt[isEn()?'en':'pt'];

  function dateKey(v){
    const d=new Date(v);if(Number.isNaN(d.getTime()))return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function eligibleEvent(e){
    return e?.activity_type!=='simulation'||e?.metadata?.activity_completed===true;
  }
  function canonicalEvents(){
    const p=perf();if(!p?.readEvents)return [];
    const map=new Map();
    for(const e of p.readEvents()||[]){if(e?.id)map.set(String(e.id),e)}
    return [...map.values()].filter(eligibleEvent);
  }
  function streakStats(events){
    const days=[...new Set(events.map(e=>dateKey(e.answered_at||e.created_at)).filter(Boolean))].sort();
    const set=new Set(days);let longest=0,run=0,prev=null;
    for(const key of days){const d=new Date(key+'T12:00:00');if(prev&&Math.round((d-prev)/86400000)===1)run++;else run=1;longest=Math.max(longest,run);prev=d}
    let current=0,cursor=new Date();cursor.setHours(12,0,0,0);
    for(;;){const k=dateKey(cursor);if(set.has(k)){current++;cursor=new Date(cursor.getTime()-86400000);continue}if(current===0){const y=new Date(cursor.getTime()-86400000);if(set.has(dateKey(y))){cursor=y;continue}}break}
    return {current,longest};
  }
  function completedActivityIds(events,type){
    return new Set(events.filter(e=>e.activity_type===type&&(e.metadata?.activity_completed===true||e.metadata?.session_status==='completed')).map(e=>String(e.activity_id||''))).size;
  }
  function groupSessionTimes(events){
    const by=new Map();
    for(const e of events.filter(e=>e.activity_type!=='clinical_case')){
      const id=String(e.activity_id||`single:${e.id}`);by.set(id,(by.get(id)||0)+Math.max(0,Number(e.response_time)||0));
    }
    const vals=[...by.values()];return {total:vals.reduce((a,b)=>a+b,0),avg:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0,count:vals.length};
  }
  function canonicalSummary(){
    const events=canonicalEvents();
    const questions=events.filter(e=>e.activity_type!=='clinical_case');
    const correct=questions.filter(e=>e.correct===true).length;
    const accuracy=questions.length?correct/questions.length*100:0;
    const cases=events.filter(e=>e.activity_type==='clinical_case');
    const completedTraining=completedActivityIds(events,'quick_training');
    const completedSims=completedActivityIds(events,'simulation');
    const st=streakStats(events);
    const sessions=groupSessionTimes(events);
    const xp=questions.length*3+completedTraining*30+completedSims*45+cases.length*35+Math.min(st.longest,30)*8;
    const uniqueEcgs=new Set(questions.map(e=>String(e.case_id||e.question_id||'')).filter(Boolean)).size;
    const last7=questions.filter(e=>new Date(e.answered_at||e.created_at).getTime()>=Date.now()-7*86400000).length;
    let model=null;try{model=perf()?.buildModel?.('all')||null}catch(e){console.warn('Metrics model:',e)}
    const skills=(model?.skills||[]).filter(x=>Number(x.attempts)>0);
    const reviewSkills=skills.filter(x=>Number(x.attempts)>=3&&Number(x.score)<60).sort((a,b)=>Number(a.score)-Number(b.score)||Number(b.attempts)-Number(a.attempts));
    const recommendations=(reviewSkills.length?reviewSkills:skills.slice().sort((a,b)=>Number(a.score)-Number(b.score)||Number(b.attempts)-Number(a.attempts))).slice(0,3);
    const skillMap=skills.slice().sort((a,b)=>Number(b.attempts)-Number(a.attempts)||Number(b.score)-Number(a.score)).slice(0,5);
    return {version:VERSION,events,questions,correct,accuracy,cases,completedTraining,completedSims,streak:st,studyTime:sessions.total,avgSession:sessions.avg,last7,xp,uniqueEcgs,skills,reviewSkills,recommendations,skillMap,model};
  }
  function fmtPct(n){return `${Math.round(Number(n)||0)}%`}
  function fmtDuration(sec){sec=Math.max(0,Math.round(Number(sec)||0));const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;if(h)return `${h}h ${m}m`;if(m)return `${m}m ${s}s`;return `${s}s`}
  function skillHtml(row){const score=Math.round(Number(row.score)||0);return `<div class="skill"><span>${safe(row.name)}</span><div class="progress"><i style="width:${score}%"></i></div><b>${score}%</b></div>`}
  function recommendationHtml(row,i){const score=Math.round(Number(row.score)||0),attempts=Number(row.attempts)||0;return `<div class="list-item"><div class="list-num">${String(i+1).padStart(2,'0')}</div><div><h4>${safe(row.name)}</h4><p>${attempts} ${safe(attempts===1?L().attempt:L().attempts)} • ${safe(L().review)}</p></div><span class="badge">${score}%</span></div>`}

  function renderCanonicalDashboard(){
    const el=document.getElementById('dashboard');if(!el)return;
    perf()?.backfillSources?.();
    const s=canonicalSummary();
    const rec=s.recommendations.length?s.recommendations.map(recommendationHtml).join(''):`<p class="muted">${safe(L().noData)}</p>`;
    const skills=s.skillMap.length?s.skillMap.map(skillHtml).join(''):`<p class="muted">${safe(L().notEnough)}</p>`;
    el.innerHTML=`
      <article class="card hero"><div><span class="eyebrow">${safe(L().eyebrow)}</span><h2>${safe(L().hero)}</h2><p>${safe(L().heroBody)}</p><div class="cta"><button class="btn btn-primary" data-page="treinar">${safe(L().start)}</button><button class="btn btn-ghost" data-page="simulados">${safe(L().exam)}</button></div></div><div class="pulse"><div class="pulse-ring">♥</div></div></article>
      <div class="grid stats"><article class="card stat"><span class="label">${safe(L().accuracy)}</span><strong id="statAccuracy">${fmtPct(s.accuracy)}</strong><small>${safe(L().accuracyNote)}</small></article><article class="card stat"><span class="label">${safe(L().ecgs)}</span><strong id="statCases">${s.uniqueEcgs}</strong><small>${safe(L().ecgsNote)}</small></article><article class="card stat"><span class="label">${safe(L().reviews)}</span><strong id="statReviews">${s.reviewSkills.length}</strong><small>${safe(L().reviewsNote)}</small></article><article class="card stat"><span class="label">${safe(L().xp)}</span><strong id="statXP">${s.xp.toLocaleString(isEn()?'en-US':'pt-BR')}</strong><small>${safe(L().xpNote)}</small></article></div>
      <div class="grid two"><article class="card section"><div class="section-head"><h3>${safe(L().continue)}</h3><span class="badge">${safe(L().active)}</span></div><div class="list">${rec}</div></article><article class="card section"><div class="section-head"><h3>${safe(L().skillMap)}</h3></div>${skills}</article></div>`;
    el.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>window.showPage?.(b.dataset.page));
    scheduleCloudSync(s);
  }

  function setText(el,value){if(el&&el.textContent!==String(value))el.textContent=String(value)}
  function setWidth(el,value){if(el&&el.style.width!==value)el.style.width=value}

  function patchPerformancePage(){
    if(patching)return;const page=document.getElementById('desempenho');if(!page||!page.innerHTML)return;
    patching=true;
    try{
      const s=canonicalSummary();
      const kpis=page.querySelectorAll('.perf-kpis .stat strong');
      setText(kpis[2],s.completedSims);
      setText(kpis[4],fmtDuration(s.studyTime));
      setText(kpis[5],`${s.streak.current} ${isEn()?(s.streak.current===1?'day':'days'):(s.streak.current===1?'dia':'dias')}`);
      const act=page.querySelectorAll('.perf-activity-grid strong');
      setText(act[0],new Set(s.events.map(e=>dateKey(e.answered_at||e.created_at)).filter(Boolean)).size);
      setText(act[1],s.last7);
      setText(act[2],fmtDuration(s.avgSession));
      setText(act[3],fmtDuration(s.studyTime));
      setText(act[4],s.streak.current);
      setText(act[5],s.streak.longest);
      const xpStrong=page.querySelector('.perf-xp > strong');setText(xpStrong,`${s.xp.toLocaleString(isEn()?'en-US':'pt-BR')} XP`);
      const xpSmall=page.querySelector('.perf-xp > small');if(xpSmall){const level=Math.max(1,Math.min(10,Math.floor(s.xp/1000)+1)),progress=s.xp-(level-1)*1000;setText(xpSmall,`${progress} / 1000 XP`)}
      const xpBar=page.querySelector('.perf-xp-bar i');if(xpBar){const progress=s.xp%1000;setWidth(xpBar,`${Math.min(100,progress/10)}%`)}
      scheduleCloudSync(s);
    }finally{patching=false}
  }

  async function syncCanonical(s){
    if(!hasCloud()||!userId())return;
    try{
      const uid=userId(),model=s.model||perf()?.buildModel?.('all'),m=model?.mastery||{};
      await Promise.all([
        client().from('user_progress').upsert({user_id:uid,total_answers:s.questions.length,correct_answers:s.correct,xp:s.xp,updated_at:new Date().toISOString()},{onConflict:'user_id'}),
        client().from('user_xp').upsert({user_id:uid,xp:s.xp,level:Math.max(1,Math.min(10,Math.floor(s.xp/1000)+1)),updated_at:new Date().toISOString()},{onConflict:'user_id'}),
        client().from('user_performance').upsert({user_id:uid,overall_accuracy:s.accuracy,mastery_score:Number(m.mastery)||null,quick_training_score:Number(m.quick)||null,simulation_score:Number(m.simulation)||null,clinical_case_score:Number(m.clinical)||null,progression_score:Number(m.progression)||null,total_questions:s.questions.length,total_cases:s.cases.length,total_simulations:s.completedSims,study_time:Math.round(s.studyTime),current_streak:s.streak.current,longest_streak:s.streak.longest,confidence:m.confidence||'low',updated_at:new Date().toISOString()},{onConflict:'user_id'})
      ]);
    }catch(e){console.warn('Canonical metrics sync:',e)}
  }
  function scheduleCloudSync(s){clearTimeout(syncTimer);syncTimer=setTimeout(()=>void syncCanonical(s||canonicalSummary()),700)}

  function install(){
    if(!perf())return setTimeout(install,40);
    perf()?.backfillSources?.();
    window.ECG_METRICS={version:VERSION,summary:canonicalSummary,renderDashboard:renderCanonicalDashboard,patchPerformance:patchPerformancePage,sync:()=>syncCanonical(canonicalSummary())};
    window.renderDashboard=renderCanonicalDashboard;
    window.loadUserStats=async()=>{const s=canonicalSummary();const a=document.getElementById('statAccuracy'),x=document.getElementById('statXP'),c=document.getElementById('statCases');if(a)a.textContent=fmtPct(s.accuracy);if(x)x.textContent=s.xp.toLocaleString(isEn()?'en-US':'pt-BR');if(c)c.textContent=String(s.uniqueEcgs);scheduleCloudSync(s)};
    const originalUpdate=window.updateProgress;
    if(typeof originalUpdate==='function'&&!originalUpdate.__canonicalWrapped){const wrapped=async function(correct){const r=await originalUpdate(correct);perf()?.backfillSources?.();setTimeout(()=>{if(appState()?.page==='dashboard')renderCanonicalDashboard();if(appState()?.page==='desempenho')patchPerformancePage();else scheduleCloudSync(canonicalSummary())},120);return r};wrapped.__canonicalWrapped=true;window.updateProgress=wrapped}
    if(observer)observer.disconnect();
    const performanceRoot=document.getElementById('desempenho');
    if(performanceRoot){
      let patchQueued=false;
      observer=new MutationObserver(()=>{
        if(appState()?.page!=='desempenho'||patchQueued)return;
        patchQueued=true;
        requestAnimationFrame(()=>{patchQueued=false;patchPerformancePage()});
      });
      observer.observe(performanceRoot,{childList:true,subtree:true});
    }
    window.addEventListener('ecg:pagechange',e=>{
      if(e.detail?.to==='dashboard')setTimeout(renderCanonicalDashboard,0);
      if(e.detail?.to==='desempenho')setTimeout(patchPerformancePage,0);
    });
    setTimeout(()=>{if(document.getElementById('dashboard'))renderCanonicalDashboard();if(appState()?.page==='desempenho')patchPerformancePage();else scheduleCloudSync(canonicalSummary())},80);
    window.addEventListener('storage',()=>setTimeout(()=>{if(appState()?.page==='dashboard')renderCanonicalDashboard();if(appState()?.page==='desempenho')patchPerformancePage()},80));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
