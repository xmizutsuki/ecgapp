(function(){
  const en=window.ECG_LANG==='en';
  if(!en) return;

  // Use curated English study content when available.
  if(window.ECG_STUDY_CONTENT_EN){
    window.ECG_STUDY_CONTENT = window.ECG_STUDY_CONTENT_EN;
  }else if(window.ECG_STUDY_CONTENT && window.ECG_I18N){
    window.ECG_STUDY_CONTENT = window.ECG_I18N.translateDeep(window.ECG_STUDY_CONTENT);
  }

  // IMPORTANT: ECG_REAL_LIBRARY_EN is a loader wrapper, not the final data object.
  // Returning it directly leaves cases/questions undefined and makes ECG Training
  // and Practice Exams appear empty. Always call its load() method.
  if(window.ECG_REAL_LIBRARY_EN){
    const curated=window.ECG_REAL_LIBRARY_EN;
    window.ECG_REAL_LIBRARY={
      version: curated.version || 'vector-edu-en',
      categories: curated.categories || [],
      load: async function(){
        const loaded=typeof curated.load==='function' ? await curated.load() : curated;
        return {
          version: loaded?.version || curated.version || 'vector-edu-en',
          cases: Array.isArray(loaded?.cases)?loaded.cases:[],
          questions: Array.isArray(loaded?.questions)?loaded.questions:[],
          categories: Array.isArray(loaded?.categories)?loaded.categories:(curated.categories||[]),
          counts: loaded?.counts || {}
        };
      }
    };
  }else if(window.ECG_REAL_LIBRARY && window.ECG_I18N){
    const original=window.ECG_REAL_LIBRARY;
    const originalLoad=original.load.bind(original);
    window.ECG_REAL_LIBRARY={
      ...original,
      categories: window.ECG_I18N.translateDeep(original.categories||[]),
      load: async function(){ return window.ECG_I18N.translateDeep(await originalLoad()); }
    };
  }
})();
