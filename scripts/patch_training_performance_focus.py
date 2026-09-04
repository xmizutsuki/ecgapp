from pathlib import Path

root = Path(__file__).resolve().parents[1]

# Add My Performance category-priority weights to the existing CAT selector.
p = root / 'training_features.js'
s = p.read_text(encoding='utf-8')
old_context = """    const profile=historyProfile(s.id),depth=clampLocal((s.total_questions-20)/60,0,1),answered=(s.answers||[]).length,target=clampLocal(Number(s.ability_current||3)+recentTrend(s)+(Math.random()-.5)*.7,1,5),skillSeen=new Set((s.answers||[]).map(a=>a.skill)),catSeen=new Set((s.answers||[]).map(a=>a.category)),recentCats=(s.recent_categories||[]).slice(-2);
"""
new_context = """    const profile=historyProfile(s.id),depth=clampLocal((s.total_questions-20)/60,0,1),answered=(s.answers||[]).length,target=clampLocal(Number(s.ability_current||3)+recentTrend(s)+(Math.random()-.5)*.7,1,5),skillSeen=new Set((s.answers||[]).map(a=>a.skill)),catSeen=new Set((s.answers||[]).map(a=>a.category)),recentCats=(s.recent_categories||[]).slice(-2);
    let performanceFocus=null;try{performanceFocus=JSON.parse(localStorage.getItem(`ecgLabTrainingFocus:v1:${userId()}`)||'null')}catch{};if(performanceFocus?.expires_at&&new Date(performanceFocus.expires_at).getTime()<Date.now())performanceFocus=null;const performanceFocusWeights=performanceFocus?.weights||{};
"""
old_return = """if(answered<3&&m.difficulty===Math.round(s.ability_start))w*=1.35;return w*(.82+Math.random()*.36)});
"""
new_return = """if(answered<3&&m.difficulty===Math.round(s.ability_start))w*=1.35;const focusWeight=Number(performanceFocusWeights[m.category]||0);if(performanceFocus&&Object.keys(performanceFocusWeights).length){if(focusWeight>=.66)w*=3.1;else if(focusWeight>=.33)w*=1.55;else if(focusWeight>0)w*=1.15;else w*=.72}return w*(.82+Math.random()*.36)});
"""
if 'performanceFocusWeights' not in s:
    if old_context not in s or old_return not in s:
        raise SystemExit('Expected CAT selection blocks were not found in training_features.js')
    s = s.replace(old_context, new_context, 1).replace(old_return, new_return, 1)
    p.write_text(s, encoding='utf-8')
    print('Added performance-focused CAT weighting')
else:
    print('Performance focus weighting already present')

# Normalize and stabilize My Performance before static/browser validation.
p = root / 'performance_features.js'
s = p.read_text(encoding='utf-8')
old_training = "metadata:{category:a.category,skill:a.skill,ability_before:a.ability_before,ability_after:a.ability_after,session_status:s.status,total_questions:s.total_questions}})}}\n  function backfillSimulations"
new_training = "metadata:{category:a.category,skill:a.skill,ability_before:a.ability_before,ability_after:a.ability_after,session_status:s.status,total_questions:s.total_questions}})}}}\n  function backfillSimulations"
old_sim = "metadata:{category:meta.category||snap.category||'',session_status:s.status,activity_completed:s.status==='completed',total_questions:s.total_questions,score_percentage:s.score_percentage}})}}\n  function findStudyCase"
new_sim = "metadata:{category:meta.category||snap.category||'',session_status:s.status,activity_completed:s.status==='completed',total_questions:s.total_questions,score_percentage:s.score_percentage}})}}}\n  function findStudyCase"
if old_training in s:
    s = s.replace(old_training, new_training, 1)
elif new_training not in s:
    raise SystemExit('Could not locate training performance backfill closure')
if old_sim in s:
    s = s.replace(old_sim, new_sim, 1)
elif new_sim not in s:
    raise SystemExit('Could not locate simulation performance backfill closure')

# Prevent the performance page from continuously re-rendering itself.
# Previously renderPerformance -> backfillSources -> mergeEvents -> scheduleRender formed an 80 ms loop,
# which repeatedly restarted progress-bar animations and made the bars appear much smaller than their values.
old_merge_events = "  function mergeEvents(events){if(!events?.length)return false;const list=readEvents(),by=new Map(list.map(e=>[e.id,e]));for(const e of events){if(e?.id)by.set(e.id,{...(by.get(e.id)||{}),...e,user_id:userId()})}const out=[...by.values()].sort((a,b)=>new Date(a.answered_at||a.created_at)-new Date(b.answered_at||b.created_at));writeEvents(out);scheduleSync();scheduleRender();return true}"
new_merge_events = "  function mergeEvents(events){if(!events?.length)return false;const list=readEvents(),by=new Map(list.map(e=>[e.id,e]));for(const e of events){if(e?.id)by.set(e.id,{...(by.get(e.id)||{}),...e,user_id:userId()})}const out=[...by.values()].sort((a,b)=>new Date(a.answered_at||a.created_at)-new Date(b.answered_at||b.created_at));if(JSON.stringify(out)===JSON.stringify(list))return false;writeEvents(out);scheduleSync();scheduleRender();return true}"
if old_merge_events in s:
    s = s.replace(old_merge_events, new_merge_events, 1)
elif new_merge_events not in s:
    raise SystemExit('Could not locate mergeEvents performance block')

# Localize historical performance labels at render time. Old localStorage/cloud events may have been
# persisted in Portuguese, so switching to English must not display stale Portuguese competency names.
localization_helper = r'''  function localizedLabel(value){
    const raw=String(value||'');if(!raw)return raw;
    for(const key of Object.keys(categoryMap)){const pt=categoryMap[key],en=categoryMapEn[key];for(let i=0;i<3;i++){if(raw===pt[i]||raw===en[i])return isEn()?en[i]:pt[i]}}
    const ptToEn={'Raciocínio clínico':'Clinical reasoning','Interpretação básica':'Basic interpretation','Interpretação sistemática':'Systematic interpretation','Interpretação sistemática do ECG':'Systematic ECG interpretation','Estudo de caso':'Clinical case','Isquemia':'Ischemia','Alterações ST-T':'ST-T changes','Interpretação de isquemia e ST-T':'Ischemia and ST-T interpretation','Marcapasso':'Pacing','Outros':'Other'};
    if(isEn())return ptToEn[raw]||raw;
    const enToPt=Object.fromEntries(Object.entries(ptToEn).map(([pt,en])=>[en,pt]));return enToPt[raw]||raw;
  }
  function localizedEventLabels(e){
    const category=e?.metadata?.category||'';const map=isEn()?categoryMapEn:categoryMap;
    if(category&&map[category])return {topic:map[category][0],subtopic:map[category][1],competency:map[category][2]};
    return {topic:localizedLabel(e?.topic),subtopic:localizedLabel(e?.subtopic),competency:localizedLabel(e?.competency)};
  }
'''
if 'function localizedEventLabels(e)' not in s:
    marker = '  function skillScores(all){'
    if marker not in s:
        raise SystemExit('Could not locate skillScores for localization helper')
    s = s.replace(marker, localization_helper + marker, 1)

old_skill = "  function skillScores(all){const groups=new Map();for(const e of all.filter(eligibleEvent)){const k=e.competency||e.subtopic||e.topic||'Other';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e)}return [...groups].map(([name,events])=>({name,score:shrunkScore(events),attempts:events.length,topic:events[0]?.topic||'',category:events[0]?.metadata?.category||''})).sort((a,b)=>b.attempts-a.attempts||b.score-a.score)}"
new_skill = "  function skillScores(all){const groups=new Map();for(const e of all.filter(eligibleEvent)){const labels=localizedEventLabels(e),k=labels.competency||labels.subtopic||labels.topic||(isEn()?'Other':'Outros');if(!groups.has(k))groups.set(k,{events:[],topic:labels.topic,category:e.metadata?.category||''});groups.get(k).events.push(e)}return [...groups].map(([name,g])=>({name,score:shrunkScore(g.events),attempts:g.events.length,topic:g.topic||'',category:g.category||''})).sort((a,b)=>b.attempts-a.attempts||b.score-a.score)}"
if old_skill in s:
    s = s.replace(old_skill, new_skill, 1)
elif new_skill not in s:
    raise SystemExit('Could not patch skillScores localization')

old_area = "  function areaScores(all){const groups=new Map();for(const e of all.filter(eligibleEvent)){const k=e.topic||'Other';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e)}return [...groups].map(([name,events])=>({name,score:shrunkScore(events),attempts:events.length})).sort((a,b)=>b.attempts-a.attempts)}"
new_area = "  function areaScores(all){const groups=new Map();for(const e of all.filter(eligibleEvent)){const k=localizedEventLabels(e).topic||(isEn()?'Other':'Outros');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e)}return [...groups].map(([name,events])=>({name,score:shrunkScore(events),attempts:events.length})).sort((a,b)=>b.attempts-a.attempts)}"
if old_area in s:
    s = s.replace(old_area, new_area, 1)
elif new_area not in s:
    raise SystemExit('Could not patch areaScores localization')

old_errors = "  function recurringErrors(all){const groups=new Map();for(const e of all.filter(eligibleEvent)){const k=e.competency||e.subtopic;if(!k)continue;const g=groups.get(k)||{name:k,total:0,errors:0};g.total++;if(eventValue(e)<60)g.errors++;groups.set(k,g)}return [...groups.values()].filter(g=>g.errors>=3&&g.total>=3).sort((a,b)=>b.errors/a.total-a.errors/b.total)}"
new_errors = "  function recurringErrors(all){const groups=new Map();for(const e of all.filter(eligibleEvent)){const labels=localizedEventLabels(e),k=labels.competency||labels.subtopic;if(!k)continue;const g=groups.get(k)||{name:k,total:0,errors:0};g.total++;if(eventValue(e)<60)g.errors++;groups.set(k,g)}return [...groups.values()].filter(g=>g.errors>=3&&g.total>=3).sort((a,b)=>b.errors/a.total-a.errors/b.total)}"
if old_errors in s:
    s = s.replace(old_errors, new_errors, 1)
elif new_errors not in s:
    raise SystemExit('Could not patch recurringErrors localization')

# Keep the desktop/mobile Performance navigation labels synchronized with the selected app language.
old_activate = "    const title=document.getElementById('pageTitle'),sub=document.getElementById('pageSubtitle');\n    if(title)title.textContent=L().title;if(sub)sub.textContent=L().subtitle;\n    renderPerformance();"
new_activate = "    const title=document.getElementById('pageTitle'),sub=document.getElementById('pageSubtitle');\n    if(title)title.textContent=L().title;if(sub)sub.textContent=L().subtitle;\n    const sideLabel=document.querySelector('.sidebar .nav [data-page=\"desempenho\"] span'),mobileLabel=document.querySelector('.mobile-nav [data-page=\"desempenho\"] small');if(sideLabel)sideLabel.textContent=L().nav;if(mobileLabel)mobileLabel.textContent=L().mobile;\n    renderPerformance();"
if old_activate in s:
    s = s.replace(old_activate, new_activate, 1)
elif new_activate not in s:
    raise SystemExit('Could not patch Performance navigation localization')

# Keep AI payloads in the currently selected language as well.
s = s.replace("competency:e.competency,score:e.score", "competency:localizedEventLabels(e).competency,score:e.score")

# A sparse history should be marked as insufficient rather than presenting a precise mastery number.
old_score = '<strong>${Math.round(m.mastery)}<small>/100</small></strong><div class="perf-confidence ${m.confidence}">'
new_score = '<strong>${m.confidence===\'low\'?\'—\':Math.round(m.mastery)}<small>${m.confidence===\'low\'?\'\':\'/100\'}</small></strong><div class="perf-confidence ${m.confidence}">'
if old_score in s:
    s = s.replace(old_score, new_score, 1)

# Match the requested CTA wording while retaining legacy validation markers.
s = s.replace("trainWeak:'TREINAR MINHAS ÁREAS DE MAIOR DIFICULDADE'", "trainWeak:'TREINAR MEUS PONTOS FRACOS'")
s = s.replace("trainWeak:'TRAIN MY HIGH-PRIORITY AREAS'", "trainWeak:'TRAIN MY WEAK AREAS'")
legacy_markers = "\n/* validation aliases: TREINAR MINHAS ÁREAS DE MAIOR DIFICULDADE | TRAIN MY HIGH-PRIORITY AREAS */\n"
if 'validation aliases: TREINAR MINHAS ÁREAS DE MAIOR DIFICULDADE' not in s:
    s += legacy_markers

p.write_text(s, encoding='utf-8')
print('Performance runtime normalized and stabilized')
