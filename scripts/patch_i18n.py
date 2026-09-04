from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'i18n.js'
s = p.read_text(encoding='utf-8')

# Runtime translation is intentionally limited to complete UI phrases.
# The English educational datasets are curated separately; word-by-word
# substitution caused broken grammar and corrupted medical terminology.
for entry in [
    "['antes de','before'],", "['após','after'],", "['durante','during'],",
    "['com','with'],", "['sem','without'],", "['e','and'],", "['ou','or'],", "['por','due to'],"
]:
    s = s.replace(entry, '')

old = """    for(const [pt,en] of phrasePairs){
      out=out.split(pt).join(en);
    }
    // common units/abbreviations remain unchanged; fix a few awkward collisions
"""
new = r"""    const escapeRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const replaceTerm=(text,pt,en)=>{
      const re=new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRe(pt)})(?=$|[^\\p{L}\\p{N}])`,'giu');
      return text.replace(re,(_m,prefix)=>prefix+en);
    };
    for(const [pt,en] of [...phrasePairs].sort((a,b)=>b[0].length-a[0].length)) out=replaceTerm(out,pt,en);
    // No word-by-word fallback: curated English study/training datasets are loaded separately.
    // common units/abbreviations remain unchanged; fix a few awkward collisions
"""

if old in s:
    s = s.replace(old, new)
elif 'No word-by-word fallback' not in s:
    raise SystemExit('Expected i18n translation loop not found')

p.write_text(s, encoding='utf-8')
print('Applied safe phrase-only i18n patch')
