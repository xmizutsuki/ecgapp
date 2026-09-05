/* ECG Lab — UI corrections specific to Ischemia/ST-T study cases. */
(function(){
  'use strict';
  const isEn=()=>window.ECG_LANG==='en' || document.documentElement.lang==='en';

  const originalLesson=window.renderStudyLesson;
  if(typeof originalLesson==='function'){
    window.renderStudyLesson=function(el,key){
      const out=originalLesson.apply(this,arguments);
      if(key==='ischemia'){
        const count=window.ECG_STUDY_CONTENT?.lessons?.ischemia?.cases?.length||0;
        const title=el?.querySelector('.cases-section .section-head h3');
        const note=el?.querySelector('.cases-section .section-head p');
        if(title)title.textContent=isEn()?`${count} Ischemia and ST-T case studies`:`${count} estudos de caso de Isquemia e ST-T`;
        if(note)note.textContent=isEn()?'Progressive clinical scenarios with history, vitals, tests, a synthetic 12-lead ECG, reasoning, and a focused learning point.':'Cenários clínicos progressivos com anamnese, sinais vitais, exames, ECG sintético de 12 derivações, raciocínio e ponto de aprendizagem.';
      }
      return out;
    };
  }

  const originalCase=window.renderStudyCase;
  if(typeof originalCase==='function'){
    window.renderStudyCase=function(el,lesson,id){
      const out=originalCase.apply(this,arguments);
      if(lesson?.key==='ischemia'){
        const c=(lesson.cases||[]).find(x=>x.id===id);
        const caption=el?.querySelector('.case-ecg-head small');
        if(caption)caption.textContent=c?.ecg_caption || (isEn()?'12-lead ECG • synthetic educational tracing':'ECG de 12 derivações • traçado educacional sintético');
      }
      return out;
    };
  }
})();