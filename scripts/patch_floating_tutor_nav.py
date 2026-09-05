from pathlib import Path

root = Path(__file__).resolve().parents[1]
p = root / 'app.js'
s = p.read_text(encoding='utf-8')
changed = False

# Remove only the legacy full-page Tutor entry points. Keep adjacent pages such as
# Meu Desempenho intact even when they are inserted between Simulados and Tutor.
replacements = [
    ("        ${navButton('tutor','✦','Tutor IA')}\n", ""),
    ("${mobileNav('tutor','✦','Tutor')}", ""),
    ("<section id=\"tutor\" class=\"page\"></section>", ""),
    ("renderTutor();", ""),
    (",tutor:['Tutor IA','Tire dúvidas sobre conceitos e raciocínio eletrocardiográfico.']", ""),
]

for old, new in replacements:
    if old in s:
        s = s.replace(old, new)
        changed = True

# The floating Tutor owns Tutor UI. Fail only if a real legacy navigation/page entry
# survives; do not depend on the exact ordering of neighboring feature pages.
if "navButton('tutor','✦','Tutor IA')" in s or "mobileNav('tutor','✦','Tutor')" in s or 'id="tutor" class="page"' in s:
    raise SystemExit('Legacy Tutor navigation/page could not be fully removed from app.js')

p.write_text(s, encoding='utf-8')
print('Floating Tutor navigation patch applied' if changed else 'Floating Tutor navigation already patched')

# Apply the runtime stabilization after the navigation patch. Keeping this invoked
# from the existing build step ensures GitHub Pages always receives the fixed Tutor
# even while the source remains readable as the original feature implementation.
runtime_patch = Path(__file__).with_name('patch_floating_tutor_runtime.py')
if not runtime_patch.is_file():
    raise SystemExit('Missing patch_floating_tutor_runtime.py')
exec(compile(runtime_patch.read_text(encoding='utf-8'), str(runtime_patch), 'exec'))

# Enable the AI Tutor and CaseCoach for guest/demo users too. Authentication remains
# optional: logged-in users send their access token while guests are rate-limited by
# the Edge Function using a privacy-preserving device/network bucket.
guest_patch = Path(__file__).with_name('patch_guest_ai_access.py')
if not guest_patch.is_file():
    raise SystemExit('Missing patch_guest_ai_access.py')
exec(compile(guest_patch.read_text(encoding='utf-8'), str(guest_patch), 'exec'))

# Route new account creation through a server-side admin function that marks the
# email as confirmed immediately. This removes the signup confirmation-link step
# without exposing an admin/service key in the public web bundle.
autoconfirm_patch = Path(__file__).with_name('patch_autoconfirm_signup.py')
if not autoconfirm_patch.is_file():
    raise SystemExit('Missing patch_autoconfirm_signup.py')
exec(compile(autoconfirm_patch.read_text(encoding='utf-8'), str(autoconfirm_patch), 'exec'))
