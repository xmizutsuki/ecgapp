(function(){
  const study=window.ECG_STUDY_CONTENT_EN;
  if(!study?.lessons) return;

  const P={
    normal:{chief:'No current cardiac symptoms.',history:'No known structural heart disease; functional capacity is preserved.',meds:'No rhythm-active medication is used.',exam:'Regular pulse, normal perfusion, no signs of heart failure.',labs:['Hemoglobin within reference range','Potassium 4.2 mmol/L','Magnesium 2.0 mg/dL'],imaging:'No structural cardiac abnormality is known.'},
    sinus_brady:{chief:'Slow pulse with no severe symptoms in this teaching scenario.',history:'The sinus mechanism is preserved; the patient is being evaluated for the cause of the slow rate.',meds:'No recent overdose or combination of AV-nodal blocking drugs is documented.',exam:'Bradycardic regular pulse; perfusion is preserved in this case.',labs:['Potassium 4.1 mmol/L','Magnesium 2.0 mg/dL','TSH within reference range'],imaging:'No acute structural abnormality is identified.'},
    sinus_tachy:{chief:'Palpitations with a fast regular pulse.',history:'A physiologic or compensatory driver is present in the clinical context; onset is not described as an abrupt switch-on event.',meds:'No antiarrhythmic medication is being used; stimulant exposure is documented only when part of the scenario.',exam:'Rapid regular pulse with preserved organized perfusion.',labs:['Potassium 4.0 mmol/L','Magnesium 1.9 mg/dL','Hemoglobin and thyroid testing are interpreted in the clinical context'],imaging:'Imaging is directed by the underlying trigger rather than the sinus rhythm itself.'},
    sinus_arrhythmia:{chief:'An irregular pulse discovered in an otherwise stable patient.',history:'Sinus P waves remain present and the R–R variation is associated with respiration.',meds:'No rhythm-specific medication is used.',exam:'Cyclic pulse irregularity with normal perfusion.',labs:['Electrolytes within reference range','TSH within reference range'],imaging:'No structural imaging abnormality is required to explain the rhythm.'},
    afib:{chief:'Palpitations, fatigue, or an incidentally detected irregular pulse.',history:'The rhythm is irregularly irregular without organized sinus P waves.',meds:'No medication detail in this case contradicts the observed ventricular response.',exam:'Irregularly irregular pulse; perfusion is preserved unless otherwise stated.',labs:['Potassium 4.1 mmol/L','Magnesium 2.0 mg/dL','TSH interpreted according to the scenario'],imaging:'Echocardiography is used to assess chamber size and ventricular function when indicated.'},
    flutter:{chief:'Palpitations or persistent tachycardia with organized atrial activity.',history:'Flutter waves are present with fixed or variable AV conduction.',meds:'No medication detail in this case conflicts with the documented AV conduction.',exam:'Pulse is regular with fixed conduction or variably irregular with variable conduction.',labs:['Potassium 4.0 mmol/L','Magnesium 1.9 mg/dL'],imaging:'Structural evaluation is appropriate when underlying atrial or ventricular disease is suspected.'},
    svt:{chief:'Sudden rapid palpitations with a regular narrow-complex tachycardia.',history:'The episode is abrupt and regular, without evidence that the rate is simply a gradual sinus response.',meds:'No current drug history explains a slower non-tachycardic rhythm.',exam:'Very rapid regular pulse; perfusion remains adequate in this stable teaching case.',labs:['Potassium 4.1 mmol/L','Magnesium 2.0 mg/dL','TSH within reference range'],imaging:'No major structural heart disease is identified in this case.'},
    psvt:{chief:'Abrupt-onset rapid palpitations that also terminate suddenly.',history:'The paroxysmal onset/offset pattern supports PSVT rather than gradual sinus tachycardia.',meds:'No rate-slowing medication is present at a dose that would make the recorded tachycardia implausible.',exam:'Very rapid regular pulse with preserved perfusion.',labs:['Potassium 4.1 mmol/L','Magnesium 2.0 mg/dL','TSH within reference range'],imaging:'No major structural heart disease is identified.'},
    paced:{chief:'A paced rhythm is present during device follow-up or telemetry.',history:'A pacemaker is already in place for a prior bradyarrhythmic indication.',meds:'Chronic medication does not interfere with capture in this teaching case.',exam:'Pulse corresponds to effective ventricular capture and perfusion is preserved.',labs:['Potassium 4.2 mmol/L','Magnesium 2.0 mg/dL','Creatinine 1.0 mg/dL'],imaging:'Device leads are in expected position and capture is documented.'},
    bigeminy:{chief:'Palpitations or skipped beats with a repeating ventricular ectopy pattern.',history:'A sinus beat is followed by a PVC in a repeating bigeminal pattern.',meds:'No medication history conflicts with the ectopy pattern in this case.',exam:'Peripheral pulse is intermittently irregular during PVCs; overall perfusion is preserved.',labs:['Potassium 4.0 mmol/L','Magnesium 1.9 mg/dL','Troponin is not dynamically elevated'],imaging:'No acute structural abnormality is required to explain the displayed bigeminy.'},
    trigeminy:{chief:'Intermittent palpitations with a repeating ventricular ectopy pattern.',history:'Two sinus beats are followed by one PVC in a repeating trigeminal pattern.',meds:'No medication history conflicts with the ectopy pattern in this case.',exam:'Pulse is intermittently irregular because some premature beats generate less peripheral pulse volume.',labs:['Potassium 4.0 mmol/L','Magnesium 1.9 mg/dL','Troponin is not dynamically elevated'],imaging:'Structural assessment is appropriate when ectopy is frequent or symptoms warrant it.'},
    pvc:{chief:'A premature thump, skipped beat, or incidental ventricular ectopy.',history:'The premature complex is ventricular in morphology and occurs before the next expected sinus beat.',meds:'No medication detail contradicts the ventricular ectopy shown.',exam:'An intermittent pulse deficit may occur around the premature beat; overall perfusion is preserved.',labs:['Potassium 4.0 mmol/L','Magnesium 1.9 mg/dL','Troponin is not dynamically elevated'],imaging:'No acute structural abnormality is identified in this neutral teaching scenario.'},
    pac:{chief:'Brief palpitations or an incidental premature atrial beat.',history:'An early atrial depolarization precedes the premature complex.',meds:'No medication history conflicts with the atrial ectopy in this case.',exam:'Occasional premature pulse with preserved perfusion.',labs:['Potassium 4.1 mmol/L','Magnesium 2.0 mg/dL','TSH within reference range'],imaging:'No major structural abnormality is identified.'},
    avb1:{chief:'A prolonged PR interval is found with preserved 1:1 AV conduction.',history:'Every P wave conducts and no QRS complex is dropped.',meds:'No medication detail in this case makes the observed conduction pattern implausible.',exam:'Regular pulse with preserved perfusion.',labs:['Potassium 4.1 mmol/L','Magnesium 2.0 mg/dL','Creatinine 1.0 mg/dL'],imaging:'No acute structural abnormality is identified.'},
    mobitz1:{chief:'Grouped beating or intermittent dizziness with Wenckebach conduction.',history:'PR intervals progressively lengthen before a non-conducted P wave.',meds:'No medication history contradicts a nodal Wenckebach pattern in this case.',exam:'Grouped pulse pattern; perfusion is preserved in this stable scenario.',labs:['Potassium 4.0 mmol/L','Magnesium 2.0 mg/dL','Troponin is interpreted according to the clinical context'],imaging:'No acute structural finding is required to explain the displayed Wenckebach pattern.'},
    mobitz2:{chief:'Intermittent dropped QRS complexes with a fixed PR interval in conducted beats.',history:'The pattern is consistent with infranodal conduction disease rather than progressive Wenckebach.',meds:'No medication history is used to dismiss the high-risk conduction abnormality.',exam:'Intermittent bradycardia with preserved perfusion in this monitored teaching case.',labs:['Potassium 4.1 mmol/L','Magnesium 2.0 mg/dL','Troponin is interpreted according to the scenario'],imaging:'Structural assessment is appropriate because Mobitz II may accompany cardiac disease.'},
    avb3:{chief:'Marked bradycardia with AV dissociation.',history:'Atrial and ventricular rhythms are independent and the ventricle is maintained by an escape rhythm.',meds:'No medication detail changes the finding of complete AV dissociation in this case.',exam:'Marked bradycardia; perfusion is reduced or borderline depending on the selected case.',labs:['Potassium 4.1 mmol/L','Magnesium 2.0 mg/dL','Troponin is interpreted according to the scenario'],imaging:'Structural evaluation is appropriate to investigate the cause of complete heart block.'},
    vt:{chief:'Rapid palpitations or hemodynamic symptoms with a regular wide-complex tachycardia.',history:'The tracing is treated as ventricular tachycardia in the appropriate clinical context.',meds:'No medication detail makes the recorded wide-complex tachycardia implausible.',exam:'Rapid regular pulse; perfusion ranges from preserved to borderline in these teaching cases.',labs:['Potassium 4.0 mmol/L','Magnesium 2.0 mg/dL','Troponin is interpreted according to the ischemic context'],imaging:'Structural assessment focuses on ventricular function and myocardial scar.'},
    vf:{chief:'Sudden collapse without an effective pulse.',history:'The patient is in cardiac arrest with chaotic ventricular electrical activity and no organized QRS complexes.',meds:'Medication history is not relied on before immediate recognition of the pulseless rhythm.',exam:'Unresponsive and pulseless, with absent effective breathing or agonal respirations.',labs:['Electrolytes and blood gas are obtained after return of circulation to search for reversible causes'],imaging:'Imaging is deferred until circulation is restored and the patient is stabilized.'}
  };

  const rates={
    normal:[64,68,72,76,80,84,66,74,78,70],
    sinus_brady:[42,46,50,54,58,44,48,52,56,45],
    sinus_tachy:[108,112,116,120,124,128,110,118,122,126],
    afib:[92,108,124,86,116,132,98,110,126,104],
    flutter:[150,148,100,75,146,98,120,150,100,75],
    svt:[168,176,184,172,188,180,164,170,182,178],
    psvt:[182,176,188,168,190,174,180,162,178,185],
    paced:[70,68,72,65,70,66,60,72,68,70],
    bigeminy:[84,82,88,86,78,92,86,90,94,90],
    trigeminy:[86,84,88,82,90,92,86,94,88,80],
    pvc:[78,84,88,82,90,86,72,84,76,90],
    pac:[78,72,84,68,88,86,80,96,90,74],
    avb1:[58,56,62,68,60,54,64,62,66,72],
    mobitz1:[52,50,48,54,50,56,52,50,54,58],
    mobitz2:[48,46,50,44,48,46,50,44,48,52],
    avb3:[34,40,30,38,38,36,34,32,30,42],
    vt:[168,158,174,162,152,176,170,160,156,154]
  };

  function vital(key,i){
    if(key==='vf') return 'Unresponsive, pulseless, apneic or with agonal respirations; ventricular fibrillation on the monitor.';
    if(key==='sinus_arrhythmia') return `BP ${112+(i%4)*2}/68, HR ${60+(i%5)*2}–${74+(i%5)*2} with respiratory variation, RR 14, SpO₂ 99%, T 36.5°C`;
    const r=(rates[key]||rates.normal)[i%10];
    let bp='118/72', rr=16, spo=98;
    if(key==='sinus_tachy'){bp=i===6?'92/58':'116/70';rr=20;spo=i===8?92:98;}
    else if(['svt','psvt'].includes(key)){bp=i===7?'104/66':'118/72';rr=18;spo=99;}
    else if(key==='vt'){bp=[104,96,100,98,126,88,92,100,102,94][i]+'/'+[66,60,62,62,78,56,58,64,64,60][i];rr=22;spo=[96,94,96,95,98,94,94,96,96,94][i];}
    else if(key==='avb3'){bp=[88,92,78,100,108,96,94,86,76,106][i]+'/'+[54,58,48,62,66,60,58,54,46,64][i];rr=18;spo=96;}
    else if(key==='mobitz2'){bp='104/66';rr=17;spo=97;}
    else if(key==='mobitz1'){bp='110/68';rr=16;spo=98;}
    else if(key==='sinus_brady'){bp='116/70';rr=14;spo=99;}
    else if(['afib','flutter'].includes(key)){bp='116/70';rr=18;spo=97;}
    return `BP ${bp}, HR ${r}${['afib'].includes(key)?' irregular':''}${['bigeminy','trigeminy','pvc','pac'].includes(key)?' with ectopy':''}${key==='paced'?' paced':''}, RR ${rr}, SpO₂ ${spo}%, T 36.5°C`;
  }

  let applied=0;
  for(const [key,lesson] of Object.entries(study.lessons)){
    const p=P[key]; if(!p) continue;
    (lesson.cases||[]).forEach((c,i)=>{
      c.title=`${lesson.title || key} — clinical case ${i+1}`;
      c.chief_complaint=p.chief;
      c.anamnesis=p.history;
      c.medications=p.meds;
      c.vitals=vital(key,i);
      c.physical_exam=[p.exam];
      c.labs=[...p.labs];
      c.imaging=p.imaging;
      applied++;
    });
  }
  window.ECG_STUDY_CASE_CLINICAL_EN_FIXES={version:'1.0.0',applied};
})();
