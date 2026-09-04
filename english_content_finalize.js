/* Final cleanup for the curated English runtime data. */
(function(){
  const lib=window.ECG_REAL_LIBRARY_EN;
  if(!lib) return;
  const originalLoad=lib.load.bind(lib);
  const optionMap={
    'BAV de 2º grau':'Second-degree AV block',
    'BAV de 2º grau — Mobitz I (Wenckebach)':'Second-degree AV block — Mobitz I (Wenckebach)',
    'Bloqueio de ramo isolado':'Isolated bundle-branch block',
    'PACs isoladas':'Isolated PACs',
    'Ritmo sinusal normal':'Normal sinus rhythm',
    'Taquicardia sinusal persistente':'Persistent sinus tachycardia',
    'Taquicardia supraventricular paroxística':'Paroxysmal supraventricular tachycardia'
  };
  const skillMap={ritmo:'rhythm',ectopia:'ectopy',conducao:'conduction',ventricular:'ventricular'};
  lib.load=async()=>{
    const data=await originalLoad();
    return {
      ...data,
      questions:(data.questions||[]).map(q=>({
        ...q,
        skill:skillMap[q.skill]||q.skill,
        options:(q.options||[]).map(o=>({...o,label:optionMap[o.label]||o.label}))
      }))
    };
  };
})();
