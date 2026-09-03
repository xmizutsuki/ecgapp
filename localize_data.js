(function(){
  if(window.ECG_LANG!=='en') return;
  if(window.ECG_STUDY_CONTENT_EN){
    window.ECG_STUDY_CONTENT = window.ECG_STUDY_CONTENT_EN;
  }else if(window.ECG_STUDY_CONTENT && window.ECG_I18N){
    window.ECG_STUDY_CONTENT = window.ECG_I18N.translateDeep(window.ECG_STUDY_CONTENT);
  }
  if(window.ECG_REAL_LIBRARY_EN){
    const lib=window.ECG_REAL_LIBRARY_EN;
    window.ECG_REAL_LIBRARY={
      version: lib.version,
      categories: lib.categories,
      load: async function(){ return lib; }
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
