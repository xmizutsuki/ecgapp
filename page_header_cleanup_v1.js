/* ECG Lab — hides redundant shell page title/subtitle on primary content pages. */
(function(){
  'use strict';
  const HIDE_ON=new Set(['dashboard','treinar','trilha','simulados','desempenho']);

  function activePage(){
    return document.querySelector('.main > .page.active')?.id || (typeof state!=='undefined'?state.page:null) || 'dashboard';
  }

  function sync(){
    const main=document.querySelector('.main');
    if(!main)return;
    const id=activePage();
    main.classList.toggle('hide-shell-page-meta',HIDE_ON.has(id));
  }

  window.addEventListener('ecg:pagechange',()=>requestAnimationFrame(sync));
  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-page]'))requestAnimationFrame(sync);
  },true);

  const observer=new MutationObserver(()=>requestAnimationFrame(sync));
  const boot=()=>{
    const main=document.querySelector('.main');
    if(main)observer.observe(main,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    sync();
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  window.addEventListener('load',sync,{once:true});
  window.ECG_PAGE_HEADER_CLEANUP={version:'1.0.0',sync};
})();
