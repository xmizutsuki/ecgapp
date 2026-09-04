/* ECG Lab — stable premium UI v2 runtime.
   Intentionally small: no MutationObserver, no global function wrapping, no swipe navigation, no modal drag logic. */
(function(){
  'use strict';

  let pressed=null;
  let scrollQueued=false;

  function reduced(){return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches}
  function setReduced(){document.body.classList.toggle('ui2-reduce-motion',reduced())}

  function haptic(kind='light'){
    try{
      if(!navigator.vibrate)return false;
      const pattern=kind==='medium'?15:kind==='success'?[8,28,10]:kind==='error'?[16,24,16]:7;
      return navigator.vibrate(pattern);
    }catch{return false}
  }

  function isTextInput(node){return !!node?.closest?.('input,textarea,select,[contenteditable="true"]')}
  function isPressable(node){return node?.closest?.('.btn,.chip,.answer,.nav button,.mobile-nav button,.language-options button,.auth-tabs button,.ft2-fab,.ft2-head nav button,[role="button"]')||null}

  function onPointerDown(e){
    if(e.button!=null&&e.button!==0)return;
    if(isTextInput(e.target))return;
    const el=isPressable(e.target);if(!el||el.disabled)return;
    pressed=el;el.classList.add('ui2-pressing');
  }
  function clearPress(){if(pressed){pressed.classList.remove('ui2-pressing');pressed=null}}

  function onClick(e){
    const el=isPressable(e.target);if(!el||el.disabled)return;
    const text=(el.textContent||'').toLowerCase();
    if(/finalizar|finish|concluir|complete|salvar e sair|save and exit/.test(text))haptic('medium');
    else if(/correto|correct|sucesso|success/.test(text))haptic('success');
    else haptic('light');
  }

  function updateScroll(){
    if(scrollQueued)return;scrollQueued=true;
    requestAnimationFrame(()=>{scrollQueued=false;document.body.classList.toggle('ui2-scrolled',window.scrollY>20)});
  }

  function boot(){
    document.body.classList.add('ui-v2');
    document.documentElement.dataset.ecgUi='premium-v2';
    setReduced();updateScroll();

    window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',setReduced);
    window.addEventListener('scroll',updateScroll,{passive:true});
    document.addEventListener('pointerdown',onPointerDown,{passive:true});
    window.addEventListener('pointerup',clearPress,{passive:true});
    window.addEventListener('pointercancel',clearPress,{passive:true});
    window.addEventListener('blur',clearPress);
    document.addEventListener('click',onClick,true);

    window.ECG_UI_V2={version:'2.0.0',haptic,setReducedMotion(enabled){document.body.classList.toggle('ui2-reduce-motion',!!enabled)}};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
