/* ECG Lab — app shell v5 runtime.
   Desktop/tablet uses one document scrollbar at the viewport edge while the sidebar
   remains sticky. Feedback placement and Study Path transitions are normalized
   after every shell rebuild. */
(function(){
  'use strict';

  const MOBILE_QUERY='(max-width:720px)';
  let resizeTimer=null;

  const isMobile=()=>window.matchMedia?.(MOBILE_QUERY).matches??window.innerWidth<=720;
  const isEn=()=>window.ECG_LANG==='en';

  function mainScroller(){
    // v5 intentionally has no nested desktop scroller. Kept for API compatibility.
    return null;
  }

  function scrollContentTop(behavior='auto'){
    window.scrollTo({top:0,left:0,behavior});
  }

  function normalizeShell(){
    const shell=document.querySelector('.shell');
    const sidebar=document.querySelector('.sidebar');
    const main=document.querySelector('.main');
    if(shell)shell.dataset.layout='window-scroll-v5';
    if(sidebar){
      sidebar.dataset.layoutRegion='navigation';
      sidebar.setAttribute('aria-label',isEn()?'Primary navigation':'Navegação principal');
    }
    if(main){
      main.id='appMainContent';
      main.dataset.layoutRegion='content';
    }
  }

  function placeFeedbackLauncher(){
    const launcher=document.getElementById('betaFeedbackLauncher');
    if(!launcher)return;

    const fullLabel=isEn()?'Report a beta issue':'Reportar problema do beta';
    launcher.setAttribute('aria-label',fullLabel);
    launcher.title=fullLabel;

    if(isMobile()){
      const actions=document.querySelector('.topbar .actions');
      if(actions&&launcher.parentElement!==actions)actions.insertBefore(launcher,actions.firstChild);
      launcher.textContent='⚑';
      launcher.dataset.placement='mobile-topbar';
      return;
    }

    const footer=document.querySelector('.sidebar-footer');
    if(!footer)return;
    const version=footer.querySelector('.beta-version');
    if(launcher.parentElement!==footer){
      if(version)footer.insertBefore(launcher,version);
      else footer.appendChild(launcher);
    }else if(version&&launcher.nextElementSibling!==version){
      footer.insertBefore(launcher,version);
    }
    launcher.textContent=isEn()?'Report issue':'Reportar problema';
    launcher.dataset.placement='sidebar-footer';
  }

  function sync(){
    normalizeShell();
    placeFeedbackLauncher();
  }

  const previousShell=typeof window.shell==='function'?window.shell:null;
  if(previousShell){
    window.shell=function(...args){
      const out=previousShell.apply(this,args);
      queueMicrotask(sync);
      return out;
    };
  }

  document.addEventListener('click',e=>{
    const target=e.target.closest?.('[data-study-lesson],[data-study-case],#studyBackHome,#studyBackModule,#caseBack');
    if(!target)return;
    requestAnimationFrame(()=>scrollContentTop('smooth'));
  });

  window.addEventListener('ecg:pagechange',()=>queueMicrotask(sync));
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
      sync();
      const page=window.ECG_NAVIGATION?.currentPage?.();
      if(page)window.ECG_NAVIGATION?.restore?.(page);
    },120);
  },{passive:true});

  document.addEventListener('DOMContentLoaded',sync,{once:true});
  window.addEventListener('load',sync,{once:true});
  sync();

  window.ECG_SHELL_LAYOUT={
    version:'5.0.0',
    mode:'window-scroll',
    sync,
    mainScroller,
    scrollContentTop
  };
})();
