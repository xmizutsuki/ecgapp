from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'study_content.js'


def load_content():
    text = SRC.read_text(encoding='utf-8').strip()
    prefix = 'window.ECG_STUDY_CONTENT = '
    if not text.startswith(prefix):
        raise SystemExit('Unexpected study_content.js wrapper')
    payload = text[len(prefix):]
    if payload.endswith(';'):
        payload = payload[:-1]
    return json.loads(payload)


def flat(value):
    if isinstance(value, list):
        return ' | '.join(str(x) for x in value)
    return str(value or '')


def hr_from(vitals):
    m = re.search(r'\bFC\s*(\d{2,3})\b', str(vitals or ''), re.I)
    return int(m.group(1)) if m else None


def norm(s):
    return re.sub(r'\s+', ' ', flat(s).strip().lower())


data = load_content()
lessons = data.get('lessons', {})
rows = []
for lesson_key, lesson in lessons.items():
    for case in lesson.get('cases', []) or []:
        rows.append((lesson_key, lesson.get('title', ''), case))

print(f'AUDIT total_cases={len(rows)} lessons_with_cases={sum(bool(x.get("cases")) for x in lessons.values())}')
for lesson_key, _, case in rows:
    print(f'CATALOG|{lesson_key}|{case.get("id","")}|{flat(case.get("title"))}|{flat(case.get("chief_complaint"))}')

# Flag wording that is a template/instruction rather than patient-specific clinical data.
generic_patterns = [
    r'vari[aá]vel conforme', r'conforme caso', r'\brevisar\b', r'\bconsiderar\b',
    r'\bavaliar\b', r'\bquando indicado\b', r'\bse indicado\b', r'na maioria dos casos',
    r'\bpode apresentar\b', r'\bdepende(?:ndo)?\b', r'\bhabitualmente\b',
]
fields = ['chief_complaint', 'anamnesis', 'medications', 'vitals', 'physical_exam', 'labs', 'imaging']
flags = defaultdict(list)
for lesson_key, _, case in rows:
    for field in fields:
        text = flat(case.get(field))
        if any(re.search(p, text, re.I) for p in generic_patterns):
            flags[case['id']].append(f'{field}: {text}')

# Repeated prose is a strong marker of category-level templates being reused as if patient-specific.
for field in ['medications', 'physical_exam', 'labs', 'imaging', 'anamnesis', 'chief_complaint']:
    counts = Counter(norm(case.get(field)) for _, _, case in rows if norm(case.get(field)))
    for value, count in counts.items():
        if count >= 4:
            ids = [case['id'] for _, _, case in rows if norm(case.get(field)) == value]
            print(f'REPEATED field={field} count={count} ids={",".join(ids)} value={value[:220]}')

# Rhythm-vitals coherence checks. These are screening rules, not final diagnoses.
for lesson_key, _, case in rows:
    cid = case['id']
    title = norm(case.get('title'))
    vitals = flat(case.get('vitals'))
    hr = hr_from(vitals)
    if lesson_key == 'sinus_brady' and hr is not None and hr >= 60:
        flags[cid].append(f'vitals/rhythm: sinus brady case with FC {hr}')
    if lesson_key == 'sinus_tachy' and hr is not None and hr < 100:
        flags[cid].append(f'vitals/rhythm: sinus tachy case with FC {hr}')
    if lesson_key in {'svt', 'psvt'} and hr is not None and hr < 120 and not any(x in title for x in ('ap[oó]s', 'p[oó]s-', 'convert', 'resolvid')):
        flags[cid].append(f'vitals/rhythm: SVT/PSVT case with FC {hr}')
    if lesson_key == 'vt' and hr is not None and hr < 110 and not any(x in title for x in ('ap[oó]s', 'p[oó]s-', 'convert', 'resolvid')):
        flags[cid].append(f'vitals/rhythm: VT case with FC {hr}')
    if lesson_key == 'avb3' and hr is not None and hr > 60:
        flags[cid].append(f'vitals/rhythm: complete AV block case with FC {hr}')
    if lesson_key == 'vf':
        stable_terms = bool(re.search(r'PA\s*\d|SpO|FC\s*\d', vitals, re.I))
        arrest_terms = norm(case.get('chief_complaint')) + ' ' + norm(case.get('anamnesis')) + ' ' + norm(case.get('physical_exam'))
        if stable_terms and not re.search(r'parada|sem pulso|pulseless|pcr|n[aã]o mensur', arrest_terms, re.I):
            flags[cid].append(f'vitals/rhythm: VF case appears to have stable numeric vitals: {vitals}')

# Required-field and internal-reference checks.
for lesson_key, _, case in rows:
    cid = case.get('id', '<missing>')
    for field in ['title','chief_complaint','anamnesis','medications','vitals','physical_exam','labs','imaging','question','answer','reasoning','learning_point']:
        if case.get(field) in (None, '', []):
            flags[cid].append(f'missing required field: {field}')
    image = str(case.get('ecg_image') or '')
    if lesson_key not in {'fundamentals','ischemia'} and image and '/ecg/' not in image:
        flags[cid].append(f'unexpected ECG asset: {image}')

for cid in sorted(flags):
    lesson_key, _, case = next(row for row in rows if row[2]['id'] == cid)
    print('\nCASE', cid, 'lesson=', lesson_key, 'title=', case.get('title'))
    print('  complaint=', flat(case.get('chief_complaint')))
    print('  anamnesis=', flat(case.get('anamnesis')))
    print('  medications=', flat(case.get('medications')))
    print('  vitals=', flat(case.get('vitals')))
    print('  physical_exam=', flat(case.get('physical_exam')))
    print('  labs=', flat(case.get('labs')))
    print('  imaging=', flat(case.get('imaging')))
    for f in flags[cid]:
        print('  FLAG=', f)

print(f'\nAUDIT flagged_cases={len(flags)}')
