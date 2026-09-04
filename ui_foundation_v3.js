/* ECG Lab UI Foundation v3 runtime.
   Intentionally minimal: no MutationObserver, no Storage patching and no navigation overrides. */
(function(){
  'use strict';
  let queued=false;

  function updateViewport(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      const w=window.innerWidth||document.documentElement.clientWidth||0;
      const root=document.documentElement;
      root.dataset.ecgViewport=w<480?'mobile-small':w<768?'mobile':w<1024?'tablet':w<1280?'notebook':w<1600?'desktop':'desktop-large';
      if(window.visualViewport)root.style.setProperty('--ecg-visual-height',`${Math.round(window.visualViewport.height)}px`);
    });
  }

  function boot(){
    document.body.classList.add('ui-foundation-v3');
    document.documentElement.dataset.ecgUiFoundation='v3';
    updateViewport();
    window.addEventListener('resize',updateViewport,{passive:true});
    window.visualViewport?.addEventListener?.('resize',updateViewport,{passive:true});
    window.ECG_UI_FOUNDATION={version:'3.0.0',refreshViewport:updateViewport};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
