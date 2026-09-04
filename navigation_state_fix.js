/* ECG Lab — tab navigation state preservation.
   Keeps per-tab scroll position and prevents navigation between main tabs from
   tearing down active CAT/simulation runners. Explicit Back/Exit buttons still
   control when a session is intentionally left. */
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

  function currentPage(){
    if(typeof state!=='undefined'&&state?.page)return state.page;
    return document.querySelector('.page.active')?.id||'dashboard';
  }

  function currentScroll(){
    return Math.max(0,window.scrollY||document.documentElement.scrollTop||0);
  }

  function remember(page){
    if(page&&document.getElementById(page))scrollByPage.set(page,currentScroll());
  }

  function restore(page){
    const y=scrollByPage.has(page)?scrollByPage.get(page):0;
    restoring=true;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      window.scrollTo({top:y,left:0,behavior:'auto'});
      restoring=false;
    }));
  }

  function navigate(id){
    const from=currentPage();
    const activeId=document.querySelector('.page.active')?.id||null;

    if(!document.getElementById(id))id='dashboard';

    // shell() rebuilds every .page node. In that moment state.page may already equal
    // the requested id even though the new DOM has no active page yet. Only treat
    // same-page navigation as a no-op when the DOM is already synchronized.
    if(id===from&&activeId===id)return;
    if(id!==from)remember(from);
    if(typeof state!=='undefined')state.page=id;

    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));
    document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));

    const m=meta()[id]||meta().dashboard;
    const title=document.getElementById('pageTitle');
    const subtitle=document.getElementById('pageSubtitle');
    if(title)title.textContent=m[0];
    if(subtitle)subtitle.textContent=m[1];

    if(id==='desempenho')window.ECG_PERFORMANCE?.activate?.();

    // Do not call renderTraining/renderSims here. Their current DOM is kept alive,
    // so an active question remains exactly where the user left it.
    restore(id);
    window.dispatchEvent(new CustomEvent('ecg:pagechange',{detail:{from,to:id}}));
  }

  // Loaded last: this intentionally replaces the older CAT navigation wrapper,
  // whose tab-switch behavior treated every navigation as an explicit session exit.
  window.showPage=navigate;

  // Existing handlers resolve showPage at click time, but this also covers buttons
  // inserted later by feature modules or responsive navigation.
  document.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-page]');
    if(!button)return;
    const target=button.dataset.page;
    if(!target||target===currentPage())return;
    e.preventDefault();
    navigate(target);
  },true);

  // Remember the latest position continuously so returning to a tab restores the
  // same reading/question position instead of jumping to the top.
  let scrollTick=false;
  window.addEventListener('scroll',()=>{
    if(restoring||scrollTick)return;
    scrollTick=true;
    requestAnimationFrame(()=>{scrollTick=false;remember(currentPage())});
  },{passive:true});
})();
