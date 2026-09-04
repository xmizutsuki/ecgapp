from pathlib import Path

root = Path(__file__).resolve().parents[1]

# The public Beta must allow the educational AI features without forcing account
# creation. Logged-in users still send their access token when available; guests use
# a stable local device id only for server-side abuse/rate-limit bucketing.

# Floating contextual Tutor v2.
p = root / 'floating_tutor_v2.js'
s = p.read_text(encoding='utf-8')

anchor = "  const uuid=()=>crypto?.randomUUID?.()||`tutor-${Date.now()}-${Math.random().toString(36).slice(2)}`;\n"
helper = anchor + "  const guestId=()=>{const k='ecgLabAiGuestId:v1';let id='';try{id=localStorage.getItem(k)||''}catch{}if(!id){id=crypto?.randomUUID?.()||`guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;try{localStorage.setItem(k,id)}catch{}}return String(id).slice(0,128)};\n  const aiRequestHeaders=session=>{const h={'Content-Type':'application/json','X-ECG-Guest-ID':guestId()};if(session?.access_token)h.Authorization=`Bearer ${session.access_token}`;return h};\n"
if 'const aiRequestHeaders=session=>' not in s:
    if anchor not in s:
        raise SystemExit('Could not locate Tutor helper insertion point')
    s = s.replace(anchor, helper, 1)

old_gate = "    if(!client||!st()?.user||st()?.demo){"
if old_gate in s:
    s = s.replace(old_gate, "    if(!CFG?.SUPABASE_URL){", 1)
elif "if(!CFG?.SUPABASE_URL){" not in s:
    raise SystemExit('Could not locate Tutor authenticated-only gate')

old_session = "    try{const {data:{session}}=await client.auth.getSession();if(!session?.access_token)throw new Error(isEn()?'No authenticated session.':'Sessão não autenticada.');const c=ensureConversation(),"
new_session = "    try{const sessionResult=client?.auth?await client.auth.getSession().catch(()=>null):null,session=sessionResult?.data?.session||null,c=ensureConversation(),"
if old_session in s:
    s = s.replace(old_session, new_session, 1)
elif "sessionResult=client?.auth?await client.auth.getSession().catch(()=>null):null" not in s:
    raise SystemExit('Could not make Tutor session optional')

old_headers = "headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`}"
if old_headers in s:
    s = s.replace(old_headers, "headers:aiRequestHeaders(session)", 1)
elif 'headers:aiRequestHeaders(session)' not in s:
    raise SystemExit('Could not install Tutor guest request headers')

if "!client||!st()?.user||st()?.demo" in s or "No authenticated session." in s or "Sessão não autenticada." in s:
    raise SystemExit('Tutor still contains an authenticated-only AI path')

p.write_text(s, encoding='utf-8')
print('Floating Tutor anonymous AI access enabled')

# Study Path CaseCoach AI response review.
p = root / 'study_casecoach_features.js'
s = p.read_text(encoding='utf-8')

case_anchor = "async function submitCaseReflection(c){\n"
case_helpers = "function caseAiGuestId(){const k='ecgLabAiGuestId:v1';let id='';try{id=localStorage.getItem(k)||''}catch{}if(!id){id=crypto?.randomUUID?.()||`guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;try{localStorage.setItem(k,id)}catch{}}return String(id).slice(0,128)}\nfunction caseAiRequestHeaders(session){const h={'Content-Type':'application/json','X-ECG-Guest-ID':caseAiGuestId()};if(session?.access_token)h.Authorization=`Bearer ${session.access_token}`;return h}\n\n" + case_anchor
if 'function caseAiRequestHeaders(session)' not in s:
    if case_anchor not in s:
        raise SystemExit('Could not locate CaseCoach helper insertion point')
    s = s.replace(case_anchor, case_helpers, 1)

old_case_gate = "    if(!sb||!state.user||state.demo){"
if old_case_gate in s:
    s = s.replace(old_case_gate, "    if(!CFG?.SUPABASE_URL){", 1)
elif "if(!CFG?.SUPABASE_URL){" not in s:
    raise SystemExit('Could not locate CaseCoach authenticated-only gate')

old_case_session = "    const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error(en?'Session unavailable.':'Sessão indisponível.');\n"
new_case_session = "    const sessionResult=sb?.auth?await sb.auth.getSession().catch(()=>null):null,session=sessionResult?.data?.session||null;\n"
if old_case_session in s:
    s = s.replace(old_case_session, new_case_session, 1)
elif "sessionResult=sb?.auth?await sb.auth.getSession().catch(()=>null):null" not in s:
    raise SystemExit('Could not make CaseCoach session optional')

old_case_headers = "headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`}"
if old_case_headers in s:
    s = s.replace(old_case_headers, "headers:caseAiRequestHeaders(session)", 1)
elif 'headers:caseAiRequestHeaders(session)' not in s:
    raise SystemExit('Could not install CaseCoach guest request headers')

if "!sb||!state.user||state.demo" in s or "Session unavailable." in s or "Sessão indisponível." in s:
    raise SystemExit('CaseCoach still contains an authenticated-only AI path')

p.write_text(s, encoding='utf-8')
print('CaseCoach anonymous AI access enabled')
