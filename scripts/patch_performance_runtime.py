from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'performance_features.js'
s = p.read_text(encoding='utf-8')

# The event backfill helpers contain two nested loops plus the function body.
# Keep the checked-in feature compact, but ensure all three blocks are closed
# before the browser/runtime syntax validation.
old_training = "metadata:{category:a.category,skill:a.skill,ability_before:a.ability_before,ability_after:a.ability_after,session_status:s.status,total_questions:s.total_questions}})}}\n  function backfillSimulations"
new_training = "metadata:{category:a.category,skill:a.skill,ability_before:a.ability_before,ability_after:a.ability_after,session_status:s.status,total_questions:s.total_questions}})}}}\n  function backfillSimulations"
old_sim = "metadata:{category:meta.category||snap.category||'',session_status:s.status,activity_completed:s.status==='completed',total_questions:s.total_questions,score_percentage:s.score_percentage}})}}\n  function findStudyCase"
new_sim = "metadata:{category:meta.category||snap.category||'',session_status:s.status,activity_completed:s.status==='completed',total_questions:s.total_questions,score_percentage:s.score_percentage}})}}}\n  function findStudyCase"

changed = False
if old_training in s:
    s = s.replace(old_training, new_training, 1)
    changed = True
elif new_training not in s:
    raise SystemExit('Could not locate training performance backfill closure')

if old_sim in s:
    s = s.replace(old_sim, new_sim, 1)
    changed = True
elif new_sim not in s:
    raise SystemExit('Could not locate simulation performance backfill closure')

# Sparse data must be visibly treated as insufficient rather than implying
# a precise, reliable clinical-competence score.
old_score = "<strong>${Math.round(m.mastery)}<small>/100</small></strong><div class=\"perf-confidence ${m.confidence}\">"
new_score = "<strong>${m.confidence==='low'?'—':Math.round(m.mastery)}<small>${m.confidence==='low'?'':'/100'}</small></strong><div class=\"perf-confidence ${m.confidence}\">"
if old_score in s:
    s = s.replace(old_score, new_score, 1)
    changed = True

p.write_text(s, encoding='utf-8')
print('Performance runtime patched' if changed else 'Performance runtime already patched')
