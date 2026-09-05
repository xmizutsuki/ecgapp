const fs=require('fs');
const vm=require('vm');

const DATA_FILES=[
  'study_content.js',
  'real_cases.js',
  'study_case_fix_svt_paced.js',
  'study_case_fix_ectopy.js',
  'study_case_fix_avblock1.js',
  'study_case_fix_avblock2.js',
  'study_case_fix_ventricular.js',
  'english_content.js',
  'english_content_finalize.js',
  'study_case_clinical_en_fixes.js',
  'localize_data.js',
  'study_case_ischemia.js'
];

function loadStudy(lang){
  const sandbox={
    window:{ECG_LANG:lang},
    document:{documentElement:{lang:lang==='en'?'en':'pt-BR'}},
    console,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout
  };
  vm.createContext(sandbox);
  for(const f of DATA_FILES) vm.runInContext(fs.readFileSync(f,'utf8'),sandbox,{filename:f});
  return {
    study:sandbox.window.ECG_STUDY_CONTENT,
    ptApplied:sandbox.window.ECG_STUDY_CASE_CLINICAL_FIXES?.applied,
    enApplied:sandbox.window.ECG_STUDY_CASE_CLINICAL_EN_FIXES?.applied,
    ischemiaCount:sandbox.window.ECG_ISCHEMIA_CASES?.count
  };
}

const ptLoad=loadStudy('pt-BR');
const enLoad=loadStudy('en');
if(ptLoad.ptApplied!==120) throw new Error(`Expected 120 PT case corrections, got ${ptLoad.ptApplied}`);
if(enLoad.enApplied!==190) throw new Error(`Expected 190 EN case corrections, got ${enLoad.enApplied}`);
if(ptLoad.ischemiaCount!==20||enLoad.ischemiaCount!==20) throw new Error(`Expected 20 ischemia cases in each language, got PT=${ptLoad.ischemiaCount}, EN=${enLoad.ischemiaCount}`);

const flatten=(x)=>Array.isArray(x)?x.join(' | '):String(x??'');
const all=(study)=>Object.entries(study?.lessons||{}).flatMap(([lesson,l])=>(l.cases||[]).map(c=>({lesson,...c})));
const pt=all(ptLoad.study), en=all(enLoad.study);
if(pt.length!==210) throw new Error(`PT case count ${pt.length}, expected 210`);
if(en.length!==210) throw new Error(`EN case count ${en.length}, expected 210`);

const errors=[];
const n=(s)=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const hr=(s,lang='pt')=>{const r=lang==='pt'?/\bFC(?:\s+(?:eletrica|ventricular))?\s*(\d{2,3})/i:/\bHR\s*(\d{2,3})/i;const m=flatten(s).match(r);return m?+m[1]:null};
const bp=(s,lang='pt')=>{const r=lang==='pt'?/\bPA\s*(\d{2,3})\s*\//i:/\bBP\s*(\d{2,3})\s*\//i;const m=flatten(s).match(r);return m?+m[1]:null};
const temp=(s)=>{const m=flatten(s).match(/\bT\s*(\d{2}(?:[.,]\d)?)/i);return m?+m[1].replace(',','.'):null};
const labVal=(c,label)=>{const t=flatten(c.labs);const r=new RegExp(`\\b${label}\\s*(\\d+(?:[.,]\\d+)?)`,'i');const m=t.match(r);return m?+m[1].replace(',','.'):null};
const patientFields=(c)=>[c.anamnesis,c.medications,c.vitals,c.physical_exam,c.labs,c.imaging].map(flatten).join(' | ');

const checkRhythm=(c,lang)=>{
  const h=hr(c.vitals,lang), t=n(c.title), body=n(patientFields(c));
  if(c.lesson==='sinus_brady' && (h===null||h>=60)) errors.push(`${lang}:${c.id}: sinus brady HR=${h}`);
  if(c.lesson==='sinus_tachy' && (h===null||h<100)) errors.push(`${lang}:${c.id}: sinus tachy HR=${h}`);
  if(['svt','psvt'].includes(c.lesson) && (h===null||h<140)) errors.push(`${lang}:${c.id}: SVT/PSVT HR=${h}`);
  if(c.lesson==='avb3' && (h===null||h>50)) errors.push(`${lang}:${c.id}: complete block HR=${h}`);
  if(c.lesson==='vt' && (h===null||h<130)) errors.push(`${lang}:${c.id}: VT HR=${h}`);
  if(c.lesson==='vf'){
    const hasArrest=/(sem pulso|ausencia de pulso|pulseless|without.*pulse|cardiac arrest|parada)/.test(body);
    if(!hasArrest) errors.push(`${lang}:${c.id}: VF lacks pulseless/arrest clinical state`);
    if(lang==='en' && /\bBP\s*\d+\s*\/|\bHR\s*\d+/.test(flatten(c.vitals))) errors.push(`${lang}:${c.id}: VF has stable numeric vitals`);
  }
  if(lang==='pt'){
    const k=labVal(c,'K'),mg=labVal(c,'Mg'),sbp=bp(c.vitals,'pt'),tm=temp(c.vitals),meds=n(c.medications);
    if(/hipocalem/.test(t)&&(k===null||k>=3.5)) errors.push(`pt:${c.id}: hypokalemia title but K=${k}`);
    if(/hipercalem/.test(t)&&(k===null||k<=5.0)) errors.push(`pt:${c.id}: hyperkalemia title but K=${k}`);
    if(/hipomagnes/.test(t)&&(mg===null||mg>=1.7)) errors.push(`pt:${c.id}: hypomagnesemia title but Mg=${mg}`);
    if(/febre/.test(t)&&(tm===null||tm<=37.5)) errors.push(`pt:${c.id}: fever title but T=${tm}`);
    if(/hipotens/.test(t)&&(sbp===null||sbp>=100)) errors.push(`pt:${c.id}: hypotension title but SBP=${sbp}`);
    if(/beta-bloqueador/.test(t)&&!/(metoprolol|carvedilol|atenolol|propranolol|bisoprolol|beta-bloqueador)/.test(meds)) errors.push(`pt:${c.id}: beta-blocker title without beta-blocker medication`);
    if(/digoxina/.test(t)&&!/digoxina/.test(meds)) errors.push(`pt:${c.id}: digoxin title without digoxin medication`);
    if(/diuretico/.test(t)&&!/(hidroclorotiazida|furosemida|diuretico)/.test(meds)) errors.push(`pt:${c.id}: diuretic title without diuretic medication`);
  }
};
pt.forEach(c=>checkRhythm(c,'pt'));en.forEach(c=>checkRhythm(c,'en'));

const banned=/variavel conforme caso|revisar estimulantes|revisar agentes|revisar beta-bloqueadores|na maioria dos casos|conforme etiologia|conforme cenario|medicacoes cronicas estaveis|revisao de farmacos nao elimina/i;
for(const c of pt){if(banned.test(n(patientFields(c)))) errors.push(`pt:${c.id}: residual template wording`)}

const ids=(rows)=>rows.map(x=>String(x.id));
if(new Set(ids(pt)).size!==210) errors.push('PT duplicate case IDs');
if(new Set(ids(en)).size!==210) errors.push('EN duplicate case IDs');
const required=['title','chief_complaint','anamnesis','medications','vitals','physical_exam','labs','imaging','question','answer','reasoning','learning_point'];
for(const [lang,rows] of [['pt',pt],['en',en]]){
  for(const c of rows){
    for(const k of required) if(c[k]===undefined||c[k]===null||c[k]===''||(Array.isArray(c[k])&&c[k].length===0)) errors.push(`${lang}:${c.id}: missing ${k}`);
    const d=Number(c.difficulty||0);if(d<1||d>5)errors.push(`${lang}:${c.id}: invalid difficulty ${c.difficulty}`);
  }
}

for(const [lang,study] of [['pt',ptLoad.study],['en',enLoad.study]]){
  const ischemia=study?.lessons?.ischemia?.cases||[];
  if(ischemia.length!==20) errors.push(`${lang}: ischemia case count ${ischemia.length}`);
  const expected=Array.from({length:20},(_,i)=>`isch_stt_${String(i+1).padStart(2,'0')}`);
  const actual=ischemia.map(c=>c.id);
  if(expected.some((id,i)=>actual[i]!==id)) errors.push(`${lang}: ischemia IDs/order mismatch`);
  for(const c of ischemia){
    if(!String(c.ecg_image||'').startsWith('data:image/svg+xml'))errors.push(`${lang}:${c.id}: missing synthetic SVG ECG`);
    if(!c.ecg_caption)errors.push(`${lang}:${c.id}: missing ECG caption`);
    if(!c.trap)errors.push(`${lang}:${c.id}: missing trap`);
  }
}

if(errors.length){console.error(`EFFECTIVE STUDY CASE AUDIT FAILED (${errors.length})`);errors.slice(0,120).forEach(e=>console.error(' - '+e));process.exit(1)}
console.log(`EFFECTIVE STUDY CASE AUDIT OK: PT=${pt.length}, PT corrections=${ptLoad.ptApplied}, EN=${en.length}, EN corrections=${enLoad.enApplied}, ischemia=20+20`);
