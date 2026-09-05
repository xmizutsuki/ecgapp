const fs=require('fs');
const vm=require('vm');

function rawPortuguese(){
  const sandbox={window:{ECG_LANG:'pt-BR'},console};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('study_content.js','utf8'),sandbox,{filename:'study_content.js'});
  return sandbox.window.ECG_STUDY_CONTENT;
}

function localizedEnglish(){
  const sandbox={window:{ECG_LANG:'en'},console};
  vm.createContext(sandbox);
  for(const f of ['study_content.js','real_cases.js','english_content.js','english_content_finalize.js','localize_data.js']){
    vm.runInContext(fs.readFileSync(f,'utf8'),sandbox,{filename:f});
  }
  return sandbox.window.ECG_STUDY_CONTENT;
}

function flatten(study){
  const out=[];
  for(const [lessonKey,lesson] of Object.entries(study.lessons||{})){
    for(const c of lesson.cases||[]){out.push({lesson_key:lessonKey,lesson_title:lesson.title,...c});}
  }
  return out;
}

const pt=flatten(rawPortuguese());
const en=flatten(localizedEnglish());
if(pt.length!==190||en.length!==190)throw new Error(`Expected 190 cases in each language, got pt=${pt.length}, en=${en.length}`);
const report={generated_at:new Date().toISOString(),pt,en};
fs.writeFileSync('study-case-audit-report.json',JSON.stringify(report,null,2));
console.log(`Exported ${pt.length} PT + ${en.length} EN study cases.`);
