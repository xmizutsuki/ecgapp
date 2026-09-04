/* ECG Lab — app shell v4 runtime.
   Keeps the desktop navigation rail independent from content scrolling, places the
   beta feedback action where it cannot cover the profile, and routes internal
   Study Path transitions to the real content scroller. */
(function(){
  'use strict';

  const MOBILE_QUERY='(max-width:720px)';
  let resizeTimer=null;

  const isMobile=()=>window.matchMedia?.(MOBILE_QUERY).matches??window.innerWidth<=720;
  const isEn=()=>window.ECG_LANG==='en';

  function mainScroller(){
    if(isMobile())return null;
    return document.querySelector('.main');
  }

  function scrollContentTop(behavior='auto'){
    const main=mainScroller();
    if(main){
      main.scrollTo({top:0,left:0,behavior});
      return;
    }
    window.scrollTo({top:0,left:0,behavior});
  }

  function normalizeShell(){
    const shell=document.querySelector('.shell');
    const sidebar=document.querySelector('.sidebar');
    const main=document.querySelector('.main');
    if(shell)shell.dataset.layout='split-scroll-v4';
    if(sidebar){
      sidebar.dataset.layoutRegion='navigation';
      sidebar.setAttribute('aria-label',isEn()?'Primary navigation':'Navegação principal');
    }
    if(main){
      main.id='appMainScroll';
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

  /* beta_runtime and navigation_state_fix both wrap shell(). Wrap the final chain
     once more so every auth/session rebuild receives the same layout treatment. */
  const previousShell=typeof window.shell==='function'?window.shell:null;
  if(previousShell){
    window.shell=function(...args){
      const out=previousShell.apply(this,args);
      queueMicrotask(sync);
      return out;
    };
  }

  /* Study pages re-render in place and historically called window.scrollTo().
     Desktop now scrolls .main, so route only those known in-page transitions to it. */
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
    version:'4.0.0',
    sync,
    mainScroller,
    scrollContentTop
  };
})();
