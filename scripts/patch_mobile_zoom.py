from pathlib import Path

p=Path(__file__).resolve().parents[1]/'app.js'
s=p.read_text(encoding='utf-8')
old="""  wrap.ontouchstart=e=>{const t=e.touches[0];if(t)start(t.clientX,t.clientY)};
  wrap.ontouchmove=e=>{const t=e.touches[0];if(t){e.preventDefault();move(t.clientX,t.clientY)} };
  wrap.ontouchend=end;
"""
new="""  // Touch controls: one finger pans; two fingers pinch to zoom and pan.
  // Prevent the browser from stealing the gesture while the ECG viewer is active.
  wrap.style.touchAction='none';
  wrap.style.overscrollBehavior='contain';
  let pinch=null;
  const touchDistance=(a,b)=>Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY);
  const touchMid=(a,b)=>({x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2});
  wrap.ontouchstart=e=>{
    if(e.touches.length>=2){
      e.preventDefault();end();
      const a=e.touches[0],b=e.touches[1],mid=touchMid(a,b);
      pinch={distance:Math.max(1,touchDistance(a,b)),zoom:v.zoom,offsetX:v.offsetX,offsetY:v.offsetY,midX:mid.x,midY:mid.y};
      wrap.classList.add('pinching');
      return;
    }
    const t=e.touches[0];if(t)start(t.clientX,t.clientY);
  };
  wrap.ontouchmove=e=>{
    if(e.touches.length>=2){
      e.preventDefault();
      const a=e.touches[0],b=e.touches[1],mid=touchMid(a,b);
      if(!pinch)pinch={distance:Math.max(1,touchDistance(a,b)),zoom:v.zoom,offsetX:v.offsetX,offsetY:v.offsetY,midX:mid.x,midY:mid.y};
      const ratio=touchDistance(a,b)/pinch.distance;
      v.zoom=clamp(Number((pinch.zoom*ratio).toFixed(2)),1,8);
      v.offsetX=pinch.offsetX+(mid.x-pinch.midX);
      v.offsetY=pinch.offsetY+(mid.y-pinch.midY);
      applyViewerTransform();
      return;
    }
    const t=e.touches[0];if(t){e.preventDefault();if(pinch){pinch=null;wrap.classList.remove('pinching');start(t.clientX,t.clientY)}else move(t.clientX,t.clientY)};
  };
  wrap.ontouchend=e=>{
    if(e.touches.length<2){pinch=null;wrap.classList.remove('pinching')}
    if(e.touches.length===1){const t=e.touches[0];start(t.clientX,t.clientY)}else end();
  };
  wrap.ontouchcancel=()=>{pinch=null;wrap.classList.remove('pinching');end()};
"""
if new in s:
    print('Mobile pinch zoom already patched')
elif old in s:
    p.write_text(s.replace(old,new),encoding='utf-8')
    print('Added one-finger pan and two-finger pinch zoom')
else:
    raise SystemExit('Expected touch handler block not found in app.js')

# The same build-preparation step also applies the practice-exam end-of-session behavior.
# Importing the patch module executes its idempotent source transformation.
import patch_simulation_autofinish  # noqa: E402,F401
