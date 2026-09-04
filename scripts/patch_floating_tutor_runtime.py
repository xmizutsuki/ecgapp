from pathlib import Path

root = Path(__file__).resolve().parents[1]

# Hotfix the floating Tutor observer. The first implementation observed the entire
# document and then changed text inside the observed Tutor tree on every callback.
# That self-triggered the observer continuously and could freeze the UI before the
# Tutor panel had a chance to open.
p = root / 'floating_tutor.js'
s = p.read_text(encoding='utf-8')

old_boot = """  function boot(){ui.useContext=localStorage.getItem('ecgLabTutorUseContext')!=='0';ui.socratic=localStorage.getItem('ecgLabTutorSocratic')==='1';patchSimulationStorage();patchNavigation();removeLegacyTutor();activeConversation(true);render();const mo=new MutationObserver(()=>{removeLegacyTutor();syncModeChooser();const label=document.getElementById('ftContextLabel');if(label)label.textContent=`${T().context}: ${buildContext().label||T().noContext}`});mo.observe(document.body,{subtree:true,childList:true})}
"""

new_boot = """  function syncExternalTutorUi(){
    removeLegacyTutor();
    syncModeChooser();
    const label=document.getElementById('ftContextLabel');
    if(label){
      const next=`${T().context}: ${buildContext().label||T().noContext}`;
      if(label.textContent!==next)label.textContent=next;
    }
  }
  function boot(){
    ui.useContext=localStorage.getItem('ecgLabTutorUseContext')!=='0';
    ui.socratic=localStorage.getItem('ecgLabTutorSocratic')==='1';
    patchSimulationStorage();patchNavigation();removeLegacyTutor();activeConversation(true);render();
    let scheduled=false;
    const mo=new MutationObserver(mutations=>{
      const relevant=mutations.some(m=>{
        const target=m.target?.nodeType===1?m.target:m.target?.parentElement;
        if(target?.closest?.('#floatingTutorRoot'))return false;
        if(target?.closest?.('#app')||target?.id==='app'||target?.closest?.('#simModalRoot'))return true;
        return Array.from(m.addedNodes||[]).some(n=>n?.nodeType===1&&(n.id==='app'||n.id==='simModalRoot'||n.closest?.('#app')));
      });
      if(!relevant||scheduled)return;
      scheduled=true;
      requestAnimationFrame(()=>{scheduled=false;syncExternalTutorUi()});
    });
    mo.observe(document.body,{subtree:true,childList:true});
  }
"""

if old_boot in s:
    s = s.replace(old_boot, new_boot, 1)
elif 'function syncExternalTutorUi()' not in s:
    raise SystemExit('Could not locate the floating Tutor boot observer that needs the deadlock fix')

if "new MutationObserver(()=>{removeLegacyTutor();syncModeChooser();" in s:
    raise SystemExit('Unsafe self-triggering floating Tutor observer is still present')

p.write_text(s, encoding='utf-8')
print('Floating Tutor observer deadlock fixed')

# Avoid crushing the learning interface on laptop/tablet widths. Large desktops
# may reserve space for the side panel; smaller screens use a true overlay.
p = root / 'floating_tutor.css'
css = p.read_text(encoding='utf-8')
old_layout = "@media(min-width:721px){body.tutor-panel-open .shell{padding-right:calc(var(--floating-tutor-width) + 18px);transition:padding-right .28s cubic-bezier(.2,.8,.2,1)}body.tutor-panel-open .main{max-width:none}.ft-panel.max~*{}}@media(max-width:1100px) and (min-width:721px){.ft-panel{width:min(var(--floating-tutor-width),46vw)}body.tutor-panel-open .shell{padding-right:min(calc(var(--floating-tutor-width) + 18px),46vw)}}"
new_layout = "@media(min-width:1180px){body.tutor-panel-open .shell{padding-right:calc(var(--floating-tutor-width) + 18px);transition:padding-right .28s cubic-bezier(.2,.8,.2,1)}body.tutor-panel-open .main{max-width:none}}@media(max-width:1179px) and (min-width:721px){.ft-panel{width:min(var(--floating-tutor-width),72vw)}}"
if old_layout in css:
    css = css.replace(old_layout, new_layout, 1)
elif '@media(min-width:1180px){body.tutor-panel-open .shell' not in css:
    raise SystemExit('Could not locate floating Tutor desktop layout rule')
p.write_text(css, encoding='utf-8')
print('Floating Tutor responsive layout stabilized')
