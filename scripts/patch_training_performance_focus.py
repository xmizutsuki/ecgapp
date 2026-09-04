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

# Normalize the compact My Performance source before static/browser validation.
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
print('Performance runtime normalized')
