from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'app.js'
s = p.read_text(encoding='utf-8')
changed = False

replacements = [
    ("        ${navButton('tutor','✦','Tutor IA')}\n", ""),
    ("${mobileNav('tutor','✦','Tutor')}", ""),
    ("<section id=\"simulados\" class=\"page\"></section><section id=\"tutor\" class=\"page\"></section>", "<section id=\"simulados\" class=\"page\"></section>"),
    ("renderSims();renderTutor();", "renderSims();"),
    (",tutor:['Tutor IA','Tire dúvidas sobre conceitos e raciocínio eletrocardiográfico.']", ""),
]

for old, new in replacements:
    if old in s:
        s = s.replace(old, new)
        changed = True

# Keep the old renderTutor implementation only as dead compatibility code; the floating layer owns Tutor UI.
if "navButton('tutor','✦','Tutor IA')" in s or "mobileNav('tutor','✦','Tutor')" in s or 'id="tutor" class="page"' in s:
    raise SystemExit('Legacy Tutor navigation/page could not be fully removed from app.js')

p.write_text(s, encoding='utf-8')
print('Floating Tutor navigation patch applied' if changed else 'Floating Tutor navigation already patched')
