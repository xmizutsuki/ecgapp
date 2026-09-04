from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'simulation_features.js'
s = p.read_text(encoding='utf-8')

old = """  function chooseAnswer(session,qid,index){const q=findQuestion(qid,session);if(!q)return;const opt=optionData(q)[index];if(!opt)return;const previous=session.answers?.[qid]||{};session.answers=session.answers||{};session.answers[qid]={...previous,selected_answer:index,is_correct:!!opt.correct,answered_at:nowIso(),response_time:previous.response_time||Math.max(1,Math.round((Date.now()-(runtime.questionStartedAt||Date.now()))/1000))};persistSession(session);renderRunner(session)}
"""

new = """  function chooseAnswer(session,qid,index){const q=findQuestion(qid,session);if(!q)return;const opt=optionData(q)[index];if(!opt)return;const previous=session.answers?.[qid]||{};session.answers=session.answers||{};session.answers[qid]={...previous,selected_answer:index,is_correct:!!opt.correct,answered_at:nowIso(),response_time:previous.response_time||Math.max(1,Math.round((Date.now()-(runtime.questionStartedAt||Date.now()))/1000))};const isLastQuestion=session.current_question_index===session.total_questions-1;if(isLastQuestion){finalizeSession(session);return}persistSession(session);renderRunner(session)}
"""

if new in s:
    print('Practice exam auto-finalization already patched')
elif old in s:
    p.write_text(s.replace(old, new), encoding='utf-8')
    print('Enabled automatic finalization after answering the last practice-exam question')
else:
    raise SystemExit('Expected chooseAnswer block not found in simulation_features.js')
