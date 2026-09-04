/* ECG Lab — navigation/session stability v4.
   Main-tab changes are view switches, not session exits. Active CAT/practice-exam
   DOM is preserved across Supabase shell refreshes, legacy navigation handlers are
   blocked from firing a second time, and scroll restoration follows the actual
   content scroller instead of moving the fixed sidebar. */
(function(){
  'use strict';

  const scrollByPage=new Map();
  let restoring=false;
  let shellPreserve=null;

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

  function statePage(){
    return (typeof state!=='undefined'&&state?.page)||'dashboard';
  }

  function domPage(){
    return document.querySelector('.page.active')?.id||null;
  }

  function currentPage(){
    return domPage()||statePage();
  }

  function mainScroller(){
    const main=document.querySelector('.main');
    if(!main)return null;
    if(window.matchMedia?.('(max-width:720px)').matches)return null;
    return main;
  }

  function currentScroll(){
    const main=mainScroller();
    if(main)return Math.max(0,main.scrollTop||0);
    return Math.max(0,window.scrollY||document.documentElement.scrollTop||0);
  }

  function remember(page){
    if(page&&document.getElementById(page))scrollByPage.set(page,currentScroll());
  }

  function instantScroll(y){
    const top=Math.max(0,Number(y)||0);
    const main=mainScroller();
    if(main){
      const previous=main.style.scrollBehavior;
      main.style.scrollBehavior='auto';
      main.scrollTo({top,left:0,behavior:'auto'});
      main.style.scrollBehavior=previous;
      return;
    }
    const root=document.documentElement;
    const previous=root.style.scrollBehavior;
    root.style.scrollBehavior='auto';
    window.scrollTo(0,top);
    root.style.scrollBehavior=previous;
  }

  function scrollTop({behavior='auto'}={}){
    const main=mainScroller();
    if(main){main.scrollTo({top:0,left:0,behavior});return}
    window.scrollTo({top:0,left:0,behavior});
  }

  function restore(page){
    const y=scrollByPage.get(page)||0;
    restoring=true;
    requestAnimationFrame(()=>{
      instantScroll(y);
      restoring=false;
    });
  }

  function applyPage(id){
    if(!document.getElementById(id))id='dashboard';
    if(typeof state!=='undefined')state.page=id;

    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));
    document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));

    const m=meta()[id]||meta().dashboard;
    const title=document.getElementById('pageTitle');
    const subtitle=document.getElementById('pageSubtitle');
    if(title)title.textContent=m[0];
    if(subtitle)subtitle.textContent=m[1];
    return id;
  }

  function navigate(id,{force=false,restoreScroll=true}={}){
    const from=currentPage();
    if(!document.getElementById(id))id='dashboard';

    if(!force&&id===from&&domPage()===id)return;
    if(id!==from)remember(from);

    id=applyPage(id);
    if(id==='desempenho')window.ECG_PERFORMANCE?.activate?.();
    if(restoreScroll)restore(id);

    window.dispatchEvent(new CustomEvent('ecg:pagechange',{detail:{from,to:id}}));
  }

  /*
   * Legacy feature layers installed their own showPage wrappers. Some of those
   * wrappers interpret leaving Treinar ECG as an explicit "save and exit" action.
   * This runtime is loaded last and is the single owner of main-tab navigation.
   */
  window.showPage=navigate;

  /*
   * Stop the click before old per-button onclick handlers run. Without this, one
   * click can execute both this navigator and a legacy showPage wrapper, which is
   * what caused an active question to be replaced by the training home screen.
   */
  document.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-page]');
    if(!button)return;
    const target=button.dataset.page;
    if(!target)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    navigate(target);
  },true);

  /*
   * Supabase emits auth lifecycle events such as INITIAL_SESSION/TOKEN_REFRESHED.
   * app.js may rebuild the entire shell for those events. Preserve the live runner
   * nodes (and their event handlers) across same-user shell rebuilds, and suppress
   * renderTraining/renderSims while those nodes are detached so runtime state is
   * not reset to the corresponding home screen.
   */
  const originalShell=typeof window.shell==='function'?window.shell:null;
  const originalRenderTraining=typeof window.renderTraining==='function'?window.renderTraining:null;
  const originalRenderSims=typeof window.renderSims==='function'?window.renderSims:null;
  const userKey=()=>{
    if(typeof state==='undefined')return null;
    return state?.user?.id||(state?.demo?'demo-user':null);
  };
  let renderedUserKey=userKey();

  function detachRunner(pageId,selector){
    const page=document.getElementById(pageId);
    if(!page||!page.querySelector(selector))return null;
    const fragment=document.createDocumentFragment();
    while(page.firstChild)fragment.appendChild(page.firstChild);
    return {fragment};
  }

  if(originalRenderTraining){
    window.renderTraining=function(...args){
      if(shellPreserve?.treinar)return;
      return originalRenderTraining.apply(this,args);
    };
  }

  if(originalRenderSims){
    window.renderSims=function(...args){
      if(shellPreserve?.simulados)return;
      return originalRenderSims.apply(this,args);
    };
  }

  if(originalShell){
    window.shell=function(...args){
      const nextUserKey=userKey();
      const sameUser=!!nextUserKey&&nextUserKey===renderedUserKey;
      const targetPage=statePage();

      remember(currentPage());
      shellPreserve=sameUser?{
        treinar:detachRunner('treinar','.cat-runner'),
        simulados:detachRunner('simulados','.sim-runner-shell')
      }:null;

      let result;
      try{
        result=originalShell.apply(this,args);
      }finally{
        if(shellPreserve?.treinar){
          const page=document.getElementById('treinar');
          if(page){page.replaceChildren();page.appendChild(shellPreserve.treinar.fragment)}
        }
        if(shellPreserve?.simulados){
          const page=document.getElementById('simulados');
          if(page){page.replaceChildren();page.appendChild(shellPreserve.simulados.fragment)}
        }
        shellPreserve=null;
        renderedUserKey=nextUserKey;
        applyPage(targetPage);
        restore(targetPage);
      }
      return result;
    };
  }

  // Browser history should not fight the app's own per-tab position restoration.
  try{if('scrollRestoration'in history)history.scrollRestoration='manual'}catch{}

  window.ECG_NAVIGATION={
    version:'4.0.0',
    navigate,
    currentPage,
    remember,
    restore,
    scrollTop,
    mainScroller,
    get restoring(){return restoring}
  };
})();
