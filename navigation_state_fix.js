/* ECG Lab — navigation/session stability v6.
   Main-tab changes are view switches, not session exits. Active CAT/practice-exam
   DOM is preserved across Supabase shell refreshes, legacy navigation handlers are
   blocked from firing twice, and mobile scrolling is never overridden mid-gesture. */
(function(){
  'use strict';

  const scrollByPage=new Map();
  let restoring=false;
  let shellPreserve=null;
  let touchActive=false;

  const isEn=()=>window.ECG_LANG==='en';
  const isMobile=()=>Math.max(window.innerWidth||0,document.documentElement.clientWidth||0)<=720;
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

  function statePage(){return (typeof state!=='undefined'&&state?.page)||'dashboard'}
  function domPage(){return document.querySelector('.page.active')?.id||null}
  function currentPage(){return domPage()||statePage()}
  function mainScroller(){return null}
  function currentScroll(){return Math.max(0,window.scrollY||document.documentElement.scrollTop||document.body.scrollTop||0)}
  function remember(page){if(page&&document.getElementById(page))scrollByPage.set(page,currentScroll())}

  function instantScroll(y){
    const top=Math.max(0,Number(y)||0);
    const root=document.documentElement;
    const previous=root.style.scrollBehavior;
    root.style.scrollBehavior='auto';
    window.scrollTo(0,top);
    root.style.scrollBehavior=previous;
  }

  function scrollTop({behavior='auto'}={}){window.scrollTo({top:0,left:0,behavior})}

  function restore(page,{allowDuringTouch=false}={}){
    if(isMobile()&&touchActive&&!allowDuringTouch)return;
    const y=scrollByPage.get(page)||0;
    restoring=true;
    requestAnimationFrame(()=>{
      if(!(isMobile()&&touchActive&&!allowDuringTouch))instantScroll(y);
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
    if(restoreScroll)restore(id,{allowDuringTouch:false});
    window.dispatchEvent(new CustomEvent('ecg:pagechange',{detail:{from,to:id}}));
  }

  window.showPage=navigate;

  document.addEventListener('touchstart',()=>{touchActive=true},{passive:true,capture:true});
  document.addEventListener('touchend',()=>{touchActive=false},{passive:true,capture:true});
  document.addEventListener('touchcancel',()=>{touchActive=false},{passive:true,capture:true});

  document.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-page]');
    if(!button)return;
    const target=button.dataset.page;
    if(!target)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    navigate(target);
  },true);

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
      const beforePage=currentPage();
      const beforeY=currentScroll();

      remember(beforePage);
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

        /* On phones, browser chrome changes viewport height while the finger is
           scrolling. A same-page auth/shell refresh must never schedule a stale
           requestAnimationFrame scroll restoration, because that is perceived as
           the page snapping back toward the top. Let the native viewport keep its
           current position instead. Desktop retains per-tab restoration. */
        if(!isMobile()){
          restore(targetPage);
        }else if(targetPage!==beforePage&&!touchActive){
          scrollByPage.set(targetPage,scrollByPage.get(targetPage)||0);
          restore(targetPage);
        }else{
          scrollByPage.set(targetPage,beforeY);
        }
      }
      return result;
    };
  }

  try{if('scrollRestoration'in history)history.scrollRestoration='manual'}catch{}

  window.ECG_NAVIGATION={
    version:'6.0.0',
    navigate,
    currentPage,
    remember,
    restore,
    scrollTop,
    mainScroller,
    get restoring(){return restoring},
    get touchActive(){return touchActive}
  };
})();
