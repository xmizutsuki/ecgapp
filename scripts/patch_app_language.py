from pathlib import Path

p = Path(__file__).resolve().parents[1] / "app.js"
s = p.read_text(encoding="utf-8")

old = "body:JSON.stringify({message:text})"
new = "body:JSON.stringify({message:text,language:window.ECG_LANG||'pt-BR'})"

if new in s:
    print("Tutor language payload already patched")
elif old in s:
    p.write_text(s.replace(old, new), encoding="utf-8")
    print("Patched tutor request to include selected UI language")
else:
    raise SystemExit("Expected tutor request payload was not found in app.js")
