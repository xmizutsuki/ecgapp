/* ECG Lab — Beta 1.1 lazy page rendering.
   The shell creates empty page containers up front. Rendering every hidden page
   during each shell rebuild wastes CPU and DOM work, especially on mobile.
   This layer renders only the visible page and materializes other pages just
   before navigation, without changing training/simulation state machines. */
(function(){
  'use strict';

  const getStatePage=()=>{
    try{return (typeof state!=='undefined'&&state?.page)||'dashboard'}catch{return 'dashboard'}
  };

  function renderPage(id,{force=false}={}){
    const el=document.getElementById(id);
    if(!el)return false;
    if(!force&&el.dataset.ecgLazyRendered==='1'&&el.childNodes.length)return false;

    let rendered=false;
    try{
      switch(id){
        case 'dashboard':
          if(typeof window.renderDashboard==='function'){window.renderDashboard();rendered=true}
          break;
        case 'treinar':
          if(typeof window.renderTraining==='function'){window.renderTraining();rendered=true}
          break;
        case 'trilha':
          if(typeof window.renderTrail==='function'){window.renderTrail();rendered=true}
          break;
        case 'simulados':
          if(typeof window.renderSims==='function'){window.renderSims();rendered=true}
          break;
        case 'desempenho':
          if(window.ECG_PERFORMANCE?.render){window.ECG_PERFORMANCE.render();rendered=true}
          break;
        case 'tutor':
          if(typeof window.renderTutor==='function'){window.renderTutor();rendered=true}
          break;
        case 'admin':
          if(typeof window.renderAdmin==='function'){window.renderAdmin();rendered=true}
          break;
      }
    }catch(err){
      console.warn('ECG Lab lazy page render:',id,err);
      return false;
    }
    if(rendered)el.dataset.ecgLazyRendered='1';
    return rendered;
  }

  /* shell() calls this after recreating all page containers. Render only the
     requested page; navigation will materialize the rest when needed. */
  window.renderAll=function(){
    let id=getStatePage();
    if(!document.getElementById(id))id='dashboard';
    renderPage(id,{force:true});
  };

  /* This capture listener is registered before navigation_state_fix.js, so the
     destination DOM is ready before that layer activates the page. */
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-page]');
    const id=button?.dataset?.page;
    if(id)renderPage(id);
  },true);

  /* Covers programmatic navigation and keeps the optimization compatible with
     the navigation/session stability layer. CustomEvent dispatch happens before
     the browser paints the newly activated page. */
  window.addEventListener('ecg:pagechange',event=>{
    const id=event.detail?.to;
    if(id)renderPage(id);
  });

  window.ECG_LAZY_PAGES={version:'1.0.0',render:renderPage};
})();
