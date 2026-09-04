from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'training_features.js'
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

if 'performanceFocusWeights' in s:
    print('Performance focus weighting already present')
elif old_context in s and old_return in s:
    s = s.replace(old_context, new_context, 1).replace(old_return, new_return, 1)
    p.write_text(s, encoding='utf-8')
    print('Added performance-focused CAT weighting')
else:
    raise SystemExit('Expected CAT selection blocks were not found in training_features.js')
