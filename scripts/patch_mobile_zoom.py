from pathlib import Path

root = Path(__file__).resolve().parents[1]
p = root / 'app.js'
s = p.read_text(encoding='utf-8')

# Keep the ECG trace at the same visual scale in portrait and landscape.
# The previous mobile default (2.15x) made the vector stroke look much thicker
# in portrait than in landscape, where the viewer used 1.25x.
s = s.replace(
    "function viewerBaseZoom(){return window.innerWidth<=720?2.15:1.25}",
    "function viewerBaseZoom(){return 1.25}"
)

# Allow a slightly wider zoom-out range on narrow portrait screens.
s = s.replace(
    "const zoomBy=(delta)=>{v.zoom=clamp(Number((v.zoom+delta).toFixed(2)),1,8);applyViewerTransform()};",
    "const zoomBy=(delta)=>{v.zoom=clamp(Number((v.zoom+delta).toFixed(2)),.75,8);applyViewerTransform()};"
)

old = """  wrap.ontouchstart=e=>{const t=e.touches[0];if(t)start(t.clientX,t.clientY)};
  wrap.ontouchmove=e=>{const t=e.touches[0];if(t){e.preventDefault();move(t.clientX,t.clientY)} };
  wrap.ontouchend=end;
"""
new = """  // Touch controls: one finger pans; two fingers pinch to zoom and pan.
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
      v.zoom=clamp(Number((pinch.zoom*ratio).toFixed(2)),.75,8);
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
    s = s.replace(old, new)
    print('Added one-finger pan and two-finger pinch zoom')
else:
    # A prior build may already contain the touch patch with the old 1.0 minimum.
    s = s.replace(
        "v.zoom=clamp(Number((pinch.zoom*ratio).toFixed(2)),1,8);",
        "v.zoom=clamp(Number((pinch.zoom*ratio).toFixed(2)),.75,8);"
    )

# On mobile portrait, every bundled ECG image must use the dedicated 50%-thinner
# waveform asset. This is implemented as a DOM-level source switch so it covers
# Training, CAT, simulations, case screens, previews, and any future component
# that renders the curated assets without requiring each feature to duplicate logic.
asset_anchor = "function clamp(n,min,max){return Math.max(min,Math.min(max,n))}\n"
asset_runtime = asset_anchor + """function isMobilePortraitECG(){return !!window.matchMedia?.('(max-width:720px) and (orientation:portrait)').matches}\nfunction ecgBaseAssetSrc(src=''){return String(src).replace('assets/ecg-mobile-thin/','assets/ecg/')}\nfunction ecgPortraitAssetSrc(src=''){const base=ecgBaseAssetSrc(src);return isMobilePortraitECG()&&base.includes('assets/ecg/')?base.replace('assets/ecg/','assets/ecg-mobile-thin/'):base}\nfunction syncEcgImageSource(img){if(!img?.getAttribute)return;const current=img.getAttribute('src')||'',remembered=img.dataset?.ecgBaseSrc||'',base=ecgBaseAssetSrc(remembered||current);if(!base.includes('assets/ecg/'))return;if(img.dataset)img.dataset.ecgBaseSrc=base;const target=ecgPortraitAssetSrc(base);if(current!==target)img.setAttribute('src',target)}\nfunction syncMobileEcgAssets(root=document){if(root?.matches?.('img[src]'))syncEcgImageSource(root);root?.querySelectorAll?.('img[src]').forEach(syncEcgImageSource)}\nfunction installMobileEcgAssetSwitching(){if(window.__ecgPortraitThinAssets)return;window.__ecgPortraitThinAssets=true;const run=()=>syncMobileEcgAssets(document);const observer=new MutationObserver(records=>{for(const record of records){if(record.type==='attributes'){syncEcgImageSource(record.target);continue}for(const node of record.addedNodes||[])if(node?.nodeType===1)syncMobileEcgAssets(node)}});observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});const mq=window.matchMedia?.('(max-width:720px) and (orientation:portrait)');if(mq?.addEventListener)mq.addEventListener('change',run);else mq?.addListener?.(run);window.addEventListener('orientationchange',()=>setTimeout(run,120),{passive:true});window.addEventListener('resize',()=>requestAnimationFrame(run),{passive:true});queueMicrotask(run)}\ninstallMobileEcgAssetSwitching();\n"""
if 'function installMobileEcgAssetSwitching()' not in s:
    if asset_anchor not in s:
        raise SystemExit('Could not locate ECG asset-switch insertion point')
    s = s.replace(asset_anchor, asset_runtime, 1)

p.write_text(s, encoding='utf-8')
print('Normalized ECG viewer scale to 1.25x across portrait and landscape')
print('Enabled 50% thinner ECG assets on mobile portrait')

# Patch the SVG generator so the same build emits a second 114-file library whose
# black ECG/calibration strokes are exactly 50% of the desktop/landscape originals.
# Grid and frame strokes intentionally remain unchanged for readability.
gen = root / 'scripts' / 'generate_ecg_svgs.py'
g = gen.read_text(encoding='utf-8')

sig_old = "def draw_strip_svg(path, rhythm_label, desc, y_values, extras=None):"
sig_new = "def draw_strip_svg(path, rhythm_label, desc, y_values, extras=None, stroke_scale=1.0):"
if sig_old in g:
    g = g.replace(sig_old, sig_new, 1)
elif sig_new not in g:
    raise SystemExit('Could not patch ECG SVG renderer signature')

body_old = "    d = \"M \" + \" L \".join(pts)\n    extra_svg = '\\n'.join(extras or [])\n    path.write_text(f'''<svg"
body_new = "    d = \"M \" + \" L \".join(pts)\n    trace_sw = TRACE_SW * stroke_scale\n    cal_sw = CAL_SW * stroke_scale\n    extra_svg = '\\n'.join(extras or [])\n    if stroke_scale != 1.0:\n        extra_svg = extra_svg.replace('stroke-width=\"0.9\"', f'stroke-width=\"{0.9 * stroke_scale:g}\"')\n    path.write_text(f'''<svg"
if body_old in g:
    g = g.replace(body_old, body_new, 1)
elif 'trace_sw = TRACE_SW * stroke_scale' not in g:
    raise SystemExit('Could not patch ECG SVG stroke scaling')

g = g.replace('stroke-width="{CAL_SW}" stroke-linejoin="round"', 'stroke-width="{cal_sw:g}" stroke-linejoin="round"')
g = g.replace('stroke-width="{TRACE_SW}" stroke-linecap="round"', 'stroke-width="{trace_sw:g}" stroke-linecap="round"')

rebuild_old = """def rebuild(output_root: Path):
    assets = output_root / 'assets' / 'ecg'
    for cat in CATEGORIES:
        d = assets / cat
        d.mkdir(parents=True, exist_ok=True)
        for i in range(1, 7):
            ys, extras = gen_signal(cat, i)
            draw_strip_svg(d / f'{cat}_{i:02d}.svg', f'{LABELS[cat]} — variação {i}',
                'Traçado vetorial educacional em Lead II, reconstruído para treinamento de interpretação de ECG.', ys, extras)
"""
rebuild_new = """def rebuild(output_root: Path):
    assets = output_root / 'assets' / 'ecg'
    mobile_assets = output_root / 'assets' / 'ecg-mobile-thin'
    for cat in CATEGORIES:
        d = assets / cat
        md = mobile_assets / cat
        d.mkdir(parents=True, exist_ok=True)
        md.mkdir(parents=True, exist_ok=True)
        for i in range(1, 7):
            ys, extras = gen_signal(cat, i)
            title = f'{LABELS[cat]} — variação {i}'
            desc = 'Traçado vetorial educacional em Lead II, reconstruído para treinamento de interpretação de ECG.'
            draw_strip_svg(d / f'{cat}_{i:02d}.svg', title, desc, ys, extras)
            draw_strip_svg(md / f'{cat}_{i:02d}.svg', title, desc, ys, extras, stroke_scale=0.5)

    normal_files = sorted(assets.rglob('*.svg'))
    mobile_files = sorted(mobile_assets.rglob('*.svg'))
    if len(normal_files) != 114 or len(mobile_files) != 114:
        raise RuntimeError(f'Expected 114 normal and 114 mobile ECG SVGs, got {len(normal_files)} and {len(mobile_files)}')
    sample = mobile_files[0].read_text(encoding='utf-8')
    if 'stroke-width="0.7"' not in sample or 'stroke-width="0.525"' not in sample:
        raise RuntimeError('Mobile ECG SVG stroke scaling validation failed')
"""
if rebuild_old in g:
    g = g.replace(rebuild_old, rebuild_new, 1)
elif "mobile_assets = output_root / 'assets' / 'ecg-mobile-thin'" not in g:
    raise SystemExit('Could not patch ECG SVG rebuild output')

g = g.replace(
    "    print('ECG SVG library rebuilt at', here / 'assets' / 'ecg')",
    "    print('ECG SVG libraries rebuilt at', here / 'assets' / 'ecg', 'and', here / 'assets' / 'ecg-mobile-thin')"
)

gen.write_text(g, encoding='utf-8')
print('Configured 114 mobile portrait ECG SVG variants at 50% stroke thickness')

# The same build-preparation step also applies the practice-exam end-of-session behavior.
# Importing the patch module executes its idempotent source transformation.
import patch_simulation_autofinish  # noqa: E402,F401
