/* ECG Lab — final UI corrections specific to Ischemia/ST-T study cases. */
(function(){
  'use strict';
  const isEn=()=>window.ECG_LANG==='en' || document.documentElement.lang==='en';

  /* The generator intentionally draws a little extra signal. Trim the fourth beat
     from each lead panel so neighboring 12-lead columns never visually overlap. */
  function normalizePanelSpacing(uri){
    if(typeof uri!=='string' || !uri.startsWith('data:image/svg+xml'))return uri;
    try{
      const comma=uri.indexOf(',');
      if(comma<0)return uri;
      let svg=decodeURIComponent(uri.slice(comma+1));
      svg=svg.replace(/d="(M 4 70.*?) L 236 70[^"]*"/g,'d="$1"');
      return uri.slice(0,comma+1)+encodeURIComponent(svg);
    }catch(_){return uri;}
  }
  const ischemiaLesson=window.ECG_STUDY_CONTENT?.lessons?.ischemia;
  if(ischemiaLesson?.cases?.length){
    ischemiaLesson.cases.forEach(c=>{c.ecg_image=normalizePanelSpacing(c.ecg_image)});
  }

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