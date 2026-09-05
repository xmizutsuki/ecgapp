/* ECG Lab — training-style interactive zoom for study-case ECG images.
   Applies globally to every .case-ecg-image rendered in the study trail. */
(function(){
  'use strict';

  const MIN_ZOOM=1;
  const MAX_ZOOM=8;
  const STEP=.3;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const baseZoom=()=>window.innerWidth<=720?2.15:1.25;
  const distance=(a,b)=>Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY);
  const midpoint=(a,b)=>({x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2});
  const labels=()=>window.ECG_LANG==='en'
    ? {out:'Zoom out',in:'Zoom in',fit:'Fit',full:'Fullscreen',hint:'Mouse wheel or pinch to zoom • drag to pan'}
    : {out:'Diminuir zoom',in:'Aumentar zoom',fit:'Ajustar',full:'Tela cheia',hint:'Role o mouse ou faça pinça para zoom • arraste para mover'};

  function injectStyles(){
    if(document.getElementById('studyCaseZoomStyles'))return;
    const style=document.createElement('style');
    style.id='studyCaseZoomStyles';
    style.textContent=`
      .case-zoom-stage{position:relative;width:100%;overflow:hidden!important;touch-action:none;overscroll-behavior:contain;cursor:grab;user-select:none;-webkit-user-select:none;background:#fff;border-radius:12px}
      .case-zoom-stage.dragging,.case-zoom-stage.pinching{cursor:grabbing}
      .case-zoom-stage .case-ecg-image{display:block;width:100%;height:auto;will-change:transform;transform-origin:center center;transition:transform .08s ease-out;-webkit-user-drag:none;user-drag:none;pointer-events:none}
      .case-zoom-stage.dragging .case-ecg-image,.case-zoom-stage.pinching .case-ecg-image{transition:none}
      .case-zoom-toolbar{position:absolute;z-index:6;right:10px;bottom:10px;display:flex;align-items:center;gap:5px;padding:6px;border-radius:12px;background:rgba(5,15,27,.88);border:1px solid rgba(255,255,255,.16);box-shadow:0 8px 24px rgba(0,0,0,.24);backdrop-filter:blur(8px)}
      .case-zoom-toolbar button{min-width:32px;height:30px;padding:0 8px;border:1px solid rgba(255,255,255,.15);border-radius:8px;background:rgba(255,255,255,.07);color:#eef6ff;font:inherit;font-size:11px;font-weight:800;cursor:pointer}
      .case-zoom-toolbar button:hover{background:rgba(255,255,255,.14)}
      .case-zoom-level{min-width:50px;text-align:center;color:#d8e8fa;font-size:10px;font-weight:800}
      .case-zoom-hint{position:absolute;z-index:5;left:10px;bottom:10px;max-width:55%;padding:6px 8px;border-radius:8px;background:rgba(5,15,27,.72);color:#d3e0ef;font-size:9px;line-height:1.25;pointer-events:none;opacity:.82}
      .case-zoom-stage:fullscreen{width:100vw;height:100vh;max-width:none;max-height:none;border-radius:0;background:#fff;display:grid;place-items:center}
      .case-zoom-stage:fullscreen .case-ecg-image{max-width:100%;max-height:100%;object-fit:contain}
      @media(max-width:760px){.case-zoom-toolbar{right:7px;bottom:7px;gap:4px;padding:5px}.case-zoom-toolbar button{min-width:34px;height:32px;padding:0 7px}.case-zoom-hint{left:7px;bottom:47px;max-width:78%;font-size:8.5px}}
    `;
    document.head.appendChild(style);
  }

  function makeToolbar(stage,state,apply,reset){
    const l=labels();
    const hint=document.createElement('div');
    hint.className='case-zoom-hint';
    hint.textContent=l.hint;

    const toolbar=document.createElement('div');
    toolbar.className='case-zoom-toolbar';
    toolbar.innerHTML=`
      <button type="button" data-case-zoom-out aria-label="${l.out}" title="${l.out}">−</button>
      <span class="case-zoom-level">100%</span>
      <button type="button" data-case-zoom-in aria-label="${l.in}" title="${l.in}">+</button>
      <button type="button" data-case-zoom-fit aria-label="${l.fit}" title="${l.fit}">${window.ECG_LANG==='en'?'Fit':'Ajustar'}</button>
      <button type="button" data-case-zoom-full aria-label="${l.full}" title="${l.full}">⛶</button>`;

    stage.appendChild(hint);
    stage.appendChild(toolbar);

    const level=toolbar.querySelector('.case-zoom-level');
    state.updateLevel=()=>{if(level)level.textContent=`${Math.round(state.zoom*100)}%`};

    toolbar.addEventListener('mousedown',e=>e.stopPropagation());
    toolbar.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});
    toolbar.querySelector('[data-case-zoom-out]').onclick=e=>{e.stopPropagation();state.zoom=clamp(Number((state.zoom-STEP).toFixed(2)),MIN_ZOOM,MAX_ZOOM);apply()};
    toolbar.querySelector('[data-case-zoom-in]').onclick=e=>{e.stopPropagation();state.zoom=clamp(Number((state.zoom+STEP).toFixed(2)),MIN_ZOOM,MAX_ZOOM);apply()};
    toolbar.querySelector('[data-case-zoom-fit]').onclick=e=>{e.stopPropagation();reset()};
    toolbar.querySelector('[data-case-zoom-full]').onclick=async e=>{
      e.stopPropagation();
      try{
        if(document.fullscreenElement)await document.exitFullscreen();
        else if(stage.requestFullscreen)await stage.requestFullscreen();
      }catch(err){console.warn('Study case ECG fullscreen:',err)}
    };
  }

  function bindImage(img){
    if(!img||img.dataset.caseZoomBound==='1')return;
    img.dataset.caseZoomBound='1';
    img.draggable=false;

    let stage=img.closest('.case-zoom-stage');
    if(!stage){
      stage=document.createElement('div');
      stage.className='case-zoom-stage';
      img.parentNode.insertBefore(stage,img);
      stage.appendChild(img);
    }

    const state={zoom:baseZoom(),offsetX:0,offsetY:0,updateLevel:null};
    const apply=()=>{
      img.style.transform=`translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.zoom})`;
      state.updateLevel?.();
    };
    const reset=()=>{state.zoom=baseZoom();state.offsetX=0;state.offsetY=0;apply()};
    const zoomBy=delta=>{state.zoom=clamp(Number((state.zoom+delta).toFixed(2)),MIN_ZOOM,MAX_ZOOM);apply()};

    makeToolbar(stage,state,apply,reset);
    apply();
    if(!img.complete)img.addEventListener('load',apply,{once:true});

    stage.addEventListener('wheel',e=>{e.preventDefault();zoomBy(e.deltaY<0?.22:-.22)},{passive:false});

    let dragging=false,lastX=0,lastY=0,pinch=null;
    const start=(x,y)=>{dragging=true;lastX=x;lastY=y;stage.classList.add('dragging')};
    const move=(x,y)=>{if(!dragging)return;state.offsetX+=x-lastX;state.offsetY+=y-lastY;lastX=x;lastY=y;apply()};
    const end=()=>{dragging=false;stage.classList.remove('dragging')};

    stage.addEventListener('mousedown',e=>{if(e.button===0&&!e.target.closest('.case-zoom-toolbar'))start(e.clientX,e.clientY)});
    stage.addEventListener('mousemove',e=>move(e.clientX,e.clientY));
    stage.addEventListener('mouseup',end);
    stage.addEventListener('mouseleave',end);
    stage.addEventListener('dblclick',e=>{
      if(e.target.closest('.case-zoom-toolbar'))return;
      state.zoom=state.zoom>baseZoom()+.2?baseZoom():Math.min(3.2,state.zoom+1);
      state.offsetX=0;state.offsetY=0;apply();
    });

    stage.addEventListener('touchstart',e=>{
      if(e.touches.length>=2){
        e.preventDefault();end();
        const a=e.touches[0],b=e.touches[1],mid=midpoint(a,b);
        pinch={distance:Math.max(1,distance(a,b)),zoom:state.zoom,offsetX:state.offsetX,offsetY:state.offsetY,midX:mid.x,midY:mid.y};
        stage.classList.add('pinching');
        return;
      }
      const t=e.touches[0];if(t)start(t.clientX,t.clientY);
    },{passive:false});

    stage.addEventListener('touchmove',e=>{
      if(e.touches.length>=2){
        e.preventDefault();
        const a=e.touches[0],b=e.touches[1],mid=midpoint(a,b);
        if(!pinch)pinch={distance:Math.max(1,distance(a,b)),zoom:state.zoom,offsetX:state.offsetX,offsetY:state.offsetY,midX:mid.x,midY:mid.y};
        const ratio=distance(a,b)/pinch.distance;
        state.zoom=clamp(Number((pinch.zoom*ratio).toFixed(2)),MIN_ZOOM,MAX_ZOOM);
        state.offsetX=pinch.offsetX+(mid.x-pinch.midX);
        state.offsetY=pinch.offsetY+(mid.y-pinch.midY);
        apply();
        return;
      }
      const t=e.touches[0];
      if(t){e.preventDefault();if(pinch){pinch=null;stage.classList.remove('pinching');start(t.clientX,t.clientY)}else move(t.clientX,t.clientY)}
    },{passive:false});

    stage.addEventListener('touchend',e=>{
      if(e.touches.length<2){pinch=null;stage.classList.remove('pinching')}
      if(e.touches.length===1){const t=e.touches[0];start(t.clientX,t.clientY)}else end();
    });
    stage.addEventListener('touchcancel',()=>{pinch=null;stage.classList.remove('pinching');end()});
    stage.addEventListener('contextmenu',e=>{if(state.zoom>baseZoom())e.preventDefault()});

    const onFullscreen=()=>{if(!document.fullscreenElement&&document.body.contains(stage))reset()};
    document.addEventListener('fullscreenchange',onFullscreen);

    const onResize=()=>{if(document.body.contains(stage))reset();else window.removeEventListener('resize',onResize)};
    window.addEventListener('resize',onResize);
  }

  function bindAll(){
    injectStyles();
    document.querySelectorAll('.case-ecg-image').forEach(bindImage);
  }

  let queued=false;
  function scheduleBind(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;bindAll()});
  }

  const observer=new MutationObserver(mutations=>{
    for(const m of mutations){
      for(const node of m.addedNodes){
        if(node.nodeType!==1)continue;
        if(node.matches?.('.case-ecg-image')||node.querySelector?.('.case-ecg-image')){scheduleBind();return;}
      }
    }
  });

  const start=()=>{bindAll();observer.observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('ecg:pagechange',e=>{if(e.detail?.to==='trilha')scheduleBind()});
  window.ECG_STUDY_CASE_ZOOM={bindAll,scheduleBind};
})();