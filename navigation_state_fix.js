/* ECG Lab — tab navigation state preservation v2.
   Keeps per-tab scroll position and prevents main-tab navigation from tearing
   down active CAT/simulation runners. Explicit Back/Exit controls still own
   session exit. */
(function(){
  'use strict';

  const scrollByPage=new Map();
  let restoring=false;

  const isEn=()=>window.ECG_LANG==='en';
  const meta=()=>isEn()?{
    dashboard:['Dashboard','Your progress and next steps.'],
    treinar:['ECG Training','Guided interpretation with immediate feedback.'],
    trilha:['Study Path','From basics to advanced topics in progressive modules.'],
    simulados:['Practice Exams','Assess your mastery with timed questions.'],
    desempenho:['My Performance','Track your progress and turn results into an objective study plan.'],
    tutor:['AI Tutor','Ask questions about ECG concepts and reasoning.'],
    admin:['Admin Panel','Manage ECGs and educational content.']
  }:{
    dashboard:['Dashboard','Seu progresso e próximos passos.'],
    treinar:['Treinar ECG','Interpretação guiada com feedback imediato.'],
    trilha:['Trilha de estudo','Do básico ao avançado em módulos progressivos.'],
    simulados:['Simulados','Avalie seu domínio com questões cronometradas.'],
    desempenho:['Meu Desempenho','Acompanhe sua evolução e transforme resultados em um plano de estudo.'],
    tutor:['Tutor IA','Tire dúvidas sobre conceitos e raciocínio eletrocardiográfico.'],
    admin:['Painel administrativo','Gerencie ECGs e conteúdo educacional.']
  };

  function activeDomPage(){
    return document.querySelector('.page.active')?.id||null;
  }

  function currentPage(){
    return activeDomPage()||(typeof state!=='undefined'&&state?.page)||'dashboard';
  }

  function currentScroll(){
    return Math.max(0,window.scrollY||document.documentElement.scrollTop||0);
  }

  function remember(page){
    if(page&&document.getElementById(page))scrollByPage.set(page,currentScroll());
  }

  function finishRestore(page){
    const y=scrollByPage.has(page)?scrollByPage.get(page):0;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const maxY=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
      window.scrollTo({top:Math.min(y,maxY),left:0,behavior:'auto'});
      restoring=false;
    }));
  }

  function navigate(id){
    if(!document.getElementById(id))id='dashboard';

    const active=activeDomPage();
    const from=active||(typeof state!=='undefined'&&state?.page)||null;

    // Only short-circuit when the requested page is actually active in the DOM.
    // renderShell() rebuilds every <section class="page"> and then calls
    // showPage(state.page); at that moment state.page already matches the target,
    // but no section has .active yet. The old implementation returned too early,
    // leaving the entire content area blank.
    if(active===id){
      if(typeof state!=='undefined')state.page=id;
      return;
    }

    if(active)remember(active);
    restoring=true;

    if(typeof state!=='undefined')state.page=id;
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));
    document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));

    const m=meta()[id]||meta().dashboard;
    const title=document.getElementById('pageTitle');
    const subtitle=document.getElementById('pageSubtitle');
    if(title)title.textContent=m[0];
    if(subtitle)subtitle.textContent=m[1];

    if(id==='desempenho')window.ECG_PERFORMANCE?.activate?.();

    // Do not re-render Treinar/Simulados here. Their DOM remains mounted while
    // hidden, preserving the exact active question, selected option, timers and
    // visual state. Dedicated Back/Exit controls still perform the explicit exit.
    finishRestore(id);
    window.dispatchEvent(new CustomEvent('ecg:pagechange',{detail:{from,to:id}}));
  }

  // Loaded last so this supersedes the older CAT wrapper that interpreted any
  // main-tab change as a session exit.
  window.showPage=navigate;

  // renderShell() wires all current [data-page] buttons to showPage at click time,
  // so no second capture-phase click handler is needed. Avoiding a duplicate
  // navigation pass also prevents race conditions during shell rebuilds.

  let scrollTick=false;
  window.addEventListener('scroll',()=>{
    if(restoring||scrollTick)return;
    scrollTick=true;
    requestAnimationFrame(()=>{
      scrollTick=false;
      const active=activeDomPage();
      if(active)remember(active);
    });
  },{passive:true});

  // Safety net for the already-mounted shell when this file is loaded.
  queueMicrotask(()=>{
    if(!activeDomPage()){
      const target=(typeof state!=='undefined'&&state?.page)||'dashboard';
      if(document.getElementById(target))navigate(target);
    }
  });
})();
