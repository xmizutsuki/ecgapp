/* ECG Lab — visual cleanup for marked helper/status copy.
   Removes redundant informational labels identified during UI review while keeping
   functional status, navigation, training/session state and analytics logic intact. */
(function(){
  'use strict';

  const ROOT_IDS=['dashboard','treinar','simulados','desempenho','trilha'];
  const fragments=[
    'sincronização em nuvem ativa',
    'cloud sync active',
    'biblioteca educacional validada',
    'validated educational library',
    'educational library validated',
    'nesta versão, o cat utiliza a biblioteca validada de ritmos em lead ii',
    'in this version, cat uses the validated lead ii rhythm library',
    'questões baseadas na biblioteca educacional vetorial do ecg lab',
    'questions based on the ecg lab educational vector library',
    'os dados desta página são derivados do histórico',
    'the data on this page are derived from the history',
    'base científica da trilha:',
    'scientific foundation of the study path:'
  ];

  let queued=false;
  let observer=null;

  const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
  const matches=s=>{const t=norm(s);return !!t&&fragments.some(f=>t.includes(f));};

  function removableAncestor(node,root){
    let el=node.nodeType===Node.TEXT_NODE?node.parentElement:node;
    if(!el||!root.contains(el))return null;
    const matchedText=norm(el.textContent);
    while(el.parentElement&&el.parentElement!==root){
      const p=el.parentElement;
      const pt=norm(p.textContent);
      if(pt!==matchedText||pt.length>520)break;
      if(p.matches('.page,.main,.shell,[id="dashboard"],[id="treinar"],[id="simulados"],[id="desempenho"],[id="trilha"]'))break;
      el=p;
    }
    return el;
  }

  function cleanRoot(root){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const hits=[];
    while(walker.nextNode()){
      const n=walker.currentNode;
      if(matches(n.nodeValue))hits.push(n);
    }
    for(const n of hits){
      if(!n.isConnected)continue;
      const el=removableAncestor(n,root);
      if(el&&el.isConnected)el.remove();
    }

    root.querySelectorAll('.badge:empty,.chip:empty,.muted:empty,p:empty,small:empty').forEach(el=>el.remove());
  }

  function clean(){
    queued=false;
    ROOT_IDS.forEach(id=>cleanRoot(document.getElementById(id)));
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(clean);
  }

  function observe(){
    observer?.disconnect();
    const main=document.querySelector('.main')||document.getElementById('app');
    if(!main)return;
    observer=new MutationObserver(mutations=>{
      if(mutations.some(m=>m.addedNodes?.length))schedule();
    });
    observer.observe(main,{childList:true,subtree:true});
  }

  function boot(){
    schedule();
    observe();
    window.addEventListener('ecg:pagechange',schedule);
    window.addEventListener('load',schedule,{once:true});
    window.ECG_UI_CLEANUP={version:'1.0.0',refresh:schedule};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
