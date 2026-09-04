/* ECG Lab — event-driven premium interaction runtime.
   No MutationObserver and no prototype monkey-patching. Designed to preserve ECG fidelity and app performance. */
(function(){
  'use strict';

  const reduceMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('reduce-motion');
  const coarse=()=>window.matchMedia?.('(pointer: coarse)').matches;
  const pressSelector='.btn,.chip,.answer,.nav button,.mobile-nav button,.list-item,.module,.sim-card,.clinical-case-card,.study-lesson-card,.perf-plan-item,.perf-area,.language-options button,.auth-tabs button,.ft2-fab,.ft2-action,[role="button"]';
  const pageOrder=['dashboard','treinar','trilha','simulados','desempenho','admin'];
  const pageHistory=[];
  let currentPressed=null,scrollQueued=false,swipe=null,sheetDrag=null;

  function haptic(kind='light'){
    try{
      if(!navigator.vibrate)return false;
      const pattern=kind==='medium'?15:kind==='success'?[8,35,12]:kind==='error'?[18,28,18]:8;
      return navigator.vibrate(pattern);
    }catch{return false}
  }

  function isInteractiveText(el){return !!el?.closest?.('input,textarea,select,[contenteditable="true"]')}
  function isEcgOrChart(el){return !!el?.closest?.('.ecg-wrap,.sim-ecg-viewer,.sim-ecg-shell,.sim-review-ecg,.case-ecg-card,.cat-review-ecg,.perf-chart-wrap,canvas,svg')}

  function pressStart(e){
    if(e.button!=null&&e.button!==0)return;
    if(isInteractiveText(e.target))return;
    const el=e.target.closest?.(pressSelector);if(!el||el.disabled)return;
    currentPressed=el;el.classList.add('is-pressing');
  }
  function pressEnd(){if(currentPressed){currentPressed.classList.remove('is-pressing');currentPressed=null}}

  function pageDirectionCapture(e){
    const trigger=e.target.closest?.('[data-page]');if(!trigger)return;
    const target=trigger.dataset.page,current=(typeof state!=='undefined'&&state?.page)||null;
    if(!target||!current||target===current)return;
    const a=pageOrder.indexOf(current),b=pageOrder.indexOf(target);
    document.body.dataset.motionDir=(a>=0&&b>=0&&b<a)?'back':'forward';
    if(pageHistory.at(-1)!==current)pageHistory.push(current);
    if(pageHistory.length>12)pageHistory.shift();
    requestAnimationFrame(()=>setTimeout(refreshVisibleMotion,20));
  }

  function feedbackCapture(e){
    const el=e.target.closest?.('button,.chip,.answer,[role="button"],input[type="range"]');if(!el)return;
    if(el.disabled)return;
    const text=(el.textContent||'').toLowerCase();
    if(/finalizar|finish|concluir|complete|salvar e sair|save and exit/.test(text))haptic('medium');
    else if(/correto|correct|conclu|success/.test(text))haptic('success');
    else haptic('light');
    requestAnimationFrame(()=>setTimeout(refreshVisibleMotion,25));
  }

  function onScroll(){
    if(scrollQueued)return;scrollQueued=true;
    requestAnimationFrame(()=>{scrollQueued=false;document.body.classList.toggle('ui-scrolled',window.scrollY>18)});
  }

  function animateNumber(el){
    if(!el||el.dataset.motionAnimated==='1'||reduceMotion())return;
    const raw=(el.textContent||'').trim();
    if(!/^-?\d{1,4}%?$/.test(raw))return;
    const pct=raw.endsWith('%'),target=parseInt(raw,10);if(!Number.isFinite(target))return;
    const start=Math.round(target*.72),duration=330,t0=performance.now();
    el.dataset.motionAnimated='1';
    const tick=now=>{const p=Math.min(1,(now-t0)/duration),ease=1-Math.pow(1-p,3),v=Math.round(start+(target-start)*ease);el.textContent=`${v}${pct?'%':''}`;if(p<1)requestAnimationFrame(tick);else el.textContent=raw};
    requestAnimationFrame(tick);
  }

  function refreshVisibleMotion(){
    document.querySelectorAll('.page.active .stat strong,.page.active .perf-mastery-score>strong,.page.active .perf-area strong,.page.active .cat-result-score strong,.page.active .sim-result strong').forEach(animateNumber);
  }

  /* Swipe from the physical left edge only; never starts over ECGs/charts. */
  function touchStart(e){
    if(e.touches?.length!==1||window.innerWidth>900)return;
    const t=e.touches[0];if(t.clientX>22||isEcgOrChart(e.target)||isInteractiveText(e.target))return;
    swipe={x:t.clientX,y:t.clientY,lastX:t.clientX,started:performance.now()};
  }
  function touchMove(e){if(!swipe||e.touches?.length!==1)return;const t=e.touches[0];swipe.lastX=t.clientX;const dx=t.clientX-swipe.x,dy=t.clientY-swipe.y;if(dx>12&&Math.abs(dx)>Math.abs(dy)*1.35)e.preventDefault()}
  function touchEnd(e){
    if(!swipe)return;const dx=swipe.lastX-swipe.x,dt=performance.now()-swipe.started;const valid=dx>82&&dt<650;swipe=null;if(!valid)return;
    const previous=pageHistory.pop();if(!previous||typeof showPage!=='function')return;
    document.body.dataset.motionDir='back';haptic('light');showPage(previous);requestAnimationFrame(refreshVisibleMotion);
  }

  function sheetElement(target){return target.closest?.('.modal,.sim-modal,.cat-modal')||null}
  function sheetBackdrop(sheet){return sheet?.closest?.('.modal-backdrop,.sim-modal-backdrop,.cat-modal-backdrop')||null}
  function sheetPointerDown(e){
    if(window.innerWidth>720||e.button!==0)return;
    const sheet=sheetElement(e.target);if(!sheet||isInteractiveText(e.target)||e.target.closest('button,a'))return;
    const r=sheet.getBoundingClientRect();if(e.clientY-r.top>46)return;
    sheetDrag={sheet,startY:e.clientY,lastY:e.clientY};sheet.style.transition='none';sheet.setPointerCapture?.(e.pointerId);
  }
  function sheetPointerMove(e){if(!sheetDrag)return;sheetDrag.lastY=e.clientY;const dy=Math.max(0,e.clientY-sheetDrag.startY);sheetDrag.sheet.style.transform=`translate3d(0,${Math.min(dy,180)}px,0)`}
  function sheetPointerUp(){
    if(!sheetDrag)return;const {sheet,startY,lastY}=sheetDrag,dy=lastY-startY;sheetDrag=null;sheet.style.transition='';sheet.style.transform='';if(dy<90)return;
    const backdrop=sheetBackdrop(sheet);const close=sheet.querySelector('[data-close-modal],.modal-close,#simNewCancel,[data-sim-modal-action="0"],#catModalKeep');
    if(close){haptic('light');close.click()}else if(backdrop?.id==='authModal')backdrop.classList.add('hidden');
  }

  function setReduceMotionClass(){document.body.classList.toggle('reduce-motion',!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)}

  function boot(){
    setReduceMotionClass();onScroll();refreshVisibleMotion();
    window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',setReduceMotionClass);
    window.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('pointerup',pressEnd,{passive:true});window.addEventListener('pointercancel',pressEnd,{passive:true});window.addEventListener('blur',pressEnd);
    document.addEventListener('pointerdown',pressStart,{passive:true});
    document.addEventListener('click',pageDirectionCapture,true);
    document.addEventListener('click',feedbackCapture,true);
    document.addEventListener('touchstart',touchStart,{passive:true});
    document.addEventListener('touchmove',touchMove,{passive:false});
    document.addEventListener('touchend',touchEnd,{passive:true});
    document.addEventListener('pointerdown',sheetPointerDown,{passive:true});
    document.addEventListener('pointermove',sheetPointerMove,{passive:true});
    document.addEventListener('pointerup',sheetPointerUp,{passive:true});

    /* Refresh after common asynchronous state changes without observing the whole DOM. */
    ['online','offline','resize','orientationchange'].forEach(type=>window.addEventListener(type,()=>requestAnimationFrame(refreshVisibleMotion),{passive:true}));
  }

  window.ECG_MOTION={
    haptic,
    refresh:refreshVisibleMotion,
    animateNumber,
    setReducedMotion(enabled){document.body.classList.toggle('reduce-motion',!!enabled)},
    skeleton(el,on=true){if(typeof el==='string')el=document.querySelector(el);el?.classList.toggle('ui-skeleton',!!on);return el},
    async withSkeleton(el,promise){const node=typeof el==='string'?document.querySelector(el):el;node?.classList.add('ui-skeleton');try{return await promise}finally{node?.classList.remove('ui-skeleton')}},
    toast(message){if(typeof toast==='function')toast(message)},
    version:1
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
