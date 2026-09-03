(function(){
  if(!window.ECG_I18N || window.ECG_LANG!=='en') return;
  if(window.ECG_STUDY_CONTENT){
    window.ECG_STUDY_CONTENT = window.ECG_I18N.translateDeep(window.ECG_STUDY_CONTENT);
  }
  if(window.ECG_REAL_LIBRARY){
    const original=window.ECG_REAL_LIBRARY;
    const originalLoad=original.load.bind(original);
    window.ECG_REAL_LIBRARY={
      ...original,
      categories: window.ECG_I18N.translateDeep(original.categories||[]),
      load: async function(){ return window.ECG_I18N.translateDeep(await originalLoad()); }
    };
  }
})();
