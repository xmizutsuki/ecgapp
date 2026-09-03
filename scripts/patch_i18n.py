from pathlib import Path

p = Path(__file__).resolve().parents[1] / "i18n.js"
s = p.read_text(encoding="utf-8")

old = """    for(const [pt,en] of phrasePairs){
      out=out.split(pt).join(en);
    }
    // common units/abbreviations remain unchanged; fix a few awkward collisions
"""

word_map = {
    "de":"of","do":"of the","da":"of the","dos":"of the","das":"of the","com":"with","sem":"without","em":"in","no":"in the","na":"in the","nos":"in the","nas":"in the","para":"for","por":"by","uma":"a","um":"a","e":"and","ou":"or","que":"that","mas":"but","não":"not","também":"also",
    "ritmo":"rhythm","frequência":"rate","cardíaca":"cardiac","traçado":"tracing","onda":"wave","ondas":"waves","intervalo":"interval","relação":"relationship","atividade":"activity","condução":"conduction","bloqueio":"block","grau":"degree","sinusal":"sinus","taquicardia":"tachycardia","bradicardia":"bradycardia","fibrilação":"fibrillation","arritmia":"arrhythmia",
    "regular":"regular","irregular":"irregular","estreito":"narrow","estreitos":"narrow","largo":"wide","larga":"wide","largos":"wide","rápido":"fast","lento":"slow","reduzida":"reduced","aumentada":"increased","preservada":"preserved","variável":"variable","constante":"constant","organizada":"organized","caótica":"chaotic","visível":"visible","visíveis":"visible","oculta":"hidden","ausente":"absent",
    "antes":"before","depois":"after","após":"after","durante":"during","entre":"between","cada":"each","primeiro":"first","segundo":"second","terceiro":"third","progressivamente":"progressively","precedendo":"preceding","seguido":"followed","presente":"present","ausência":"absence","início":"onset","término":"termination","ocorre":"occurs","podem":"may","pode":"may","é":"is","são":"are","há":"there is",
    "paciente":"patient","história":"history","contexto":"context","caso":"case","casos":"cases","clínico":"clinical","clínica":"clinical","avaliação":"assessment","exame":"examination","exames":"tests","imagem":"imaging","medicação":"medication","medicações":"medications","fármacos":"medications","sinais":"signs","sintomas":"symptoms","pulso":"pulse","perfusão":"perfusion","pressão":"pressure","estabilidade":"stability","síncope":"syncope","tontura":"dizziness","palpitações":"palpitations","dor":"pain","respiração":"breathing","hipóxia":"hypoxia","isquemia":"ischemia","congestão":"congestion","choque":"shock",
    "doença":"disease","estrutural":"structural","cicatriz":"scar","eletrólitos":"electrolytes","causa":"cause","causas":"causes","ecocardiograma":"echocardiogram","troponina":"troponin","gasometria":"blood gas","normal":"normal","normais":"normal","estável":"stable","assintomático":"asymptomatic","assintomática":"asymptomatic","sustentada":"sustained","súbito":"sudden","súbita":"sudden","abrupto":"abrupt","abrupta":"abrupt","geralmente":"usually","frequentemente":"often",
    "reconhecer":"recognize","identificar":"identify","avaliar":"assess","revisar":"review","confirmar":"confirm","diferenciar":"differentiate","procurar":"look for","evitar":"avoid","explicar":"explain","interpretação":"interpretation","diagnóstico":"diagnosis","conclusão":"conclusion","explicação":"explanation","raciocínio":"reasoning","estudo":"study","aula":"lesson","conteúdo":"content","objetivos":"objectives","armadilhas":"pitfalls","erro":"error","erros":"errors","referências":"references","vídeos":"videos",
    "pausa":"pause","compensatória":"compensatory","espículas":"spikes","estimulação":"pacing","captura":"capture","sensoriamento":"sensing","marcapasso":"pacemaker","ectopia":"ectopy","batimento":"beat","batimentos":"beats","complexo":"complex","complexos":"complexes","padrão":"pattern","morfologia":"morphology","prematuro":"premature","prematura":"premature","precoce":"early","monomórfica":"monomorphic","monomórfico":"monomorphic","hemodinâmica":"hemodynamic",
    "hipocalemia":"hypokalemia","hipomagnesemia":"hypomagnesemia","sepse":"sepsis","tireotoxicose":"thyrotoxicosis","anemia":"anemia","hipovolemia":"hypovolemia","ansiedade":"anxiety","infecção":"infection","febre":"fever","cafeína":"caffeine","álcool":"alcohol","estimulantes":"stimulants","diuréticos":"diuretics","antiarrítmicos":"antiarrhythmics","vagal":"vagal","nodal":"nodal","infranodal":"infranodal","cardiopatia":"heart disease","cardiomiopatia":"cardiomyopathy",
    "linha":"line","derivação":"lead","derivações":"leads","contíguas":"contiguous","recíprocas":"reciprocal","elevação":"elevation","repolarização":"repolarization","pericardite":"pericarditis","aneurisma":"aneurysm","ramo":"bundle branch","hipertrofia":"hypertrophy","assistolia":"asystole","artefato":"artifact","evidência":"evidence","deterioração":"deterioration","questão":"question","resposta":"answer","correta":"correct","correto":"correct","dificuldade":"difficulty"
}

pairs = ",".join(f"{k!r}:{v!r}" for k, v in word_map.items())
replacement = """    const escapeRe=s=>s.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&');
    const replaceTerm=(text,pt,en)=>{
      const re=new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRe(pt)})(?=$|[^\\p{L}\\p{N}])`,'giu');
      return text.replace(re,(_m,prefix)=>prefix+en);
    };
    for(const [pt,en] of [...phrasePairs].sort((a,b)=>b[0].length-a[0].length)) out=replaceTerm(out,pt,en);
    const wordMap={__WORD_MAP__};
    const preserveCase=(token,replacement)=>{
      if(!replacement) return token;
      const first=token[0];
      return first && first===first.toUpperCase() && first!==first.toLowerCase() ? replacement[0].toUpperCase()+replacement.slice(1) : replacement;
    };
    out=out.replace(/\\p{L}+(?:-\\p{L}+)*/gu,token=>{
      const replacement=wordMap[token.toLocaleLowerCase('pt-BR')];
      return replacement?preserveCase(token,replacement):token;
    });
    // common units/abbreviations remain unchanged; fix a few awkward collisions
""".replace("__WORD_MAP__", pairs)

if old not in s:
    # Idempotent build: if the safe translator is already present, leave it alone.
    if "const replaceTerm=(text,pt,en)=>" in s:
        print("i18n already patched")
        raise SystemExit(0)
    raise SystemExit("Expected unsafe i18n block not found")

s = s.replace(old, replacement)
p.write_text(s, encoding="utf-8")
print("Patched i18n with boundary-safe bilingual translation")
