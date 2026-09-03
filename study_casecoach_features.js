/* ECG Lab: study PDFs + CaseCoach voice/text/AI. */
function renderStudyModule(el,moduleKey){
  const en=window.ECG_LANG==='en';
  const data=studyData();const m=data.modules.find(x=>x.key===moduleKey);if(!m){studyReset();return renderStudyHome(el)}
  const keys=m.lesson_keys||[];
  el.innerHTML=`<div class="study-breadcrumb"><button class="btn btn-ghost" id="studyBackHome">← Trilha</button><div><span class="eyebrow">Nível ${m.level}</span><h2>${esc(m.title)}</h2><p>${esc(m.description)}</p></div></div><div class="study-lesson-list">${keys.map(k=>{const l=studyLesson(k);if(!l)return'';return `<article class="card study-lesson-card"><div class="study-lesson-index">${String(keys.indexOf(k)+1).padStart(2,'0')}</div><div class="study-lesson-body"><div class="study-lesson-title"><h3>${esc(l.title)}</h3><span class="unlocked">✓ livre</span></div><p>${esc(l.summary)}</p><div class="lesson-tags"><span>Nível ${l.level}</span><span>${l.videos?.length||0} vídeo(s)</span><span>${en?'In-depth PDF':'PDF aprofundado'}</span>${l.cases?.length?`<span>${l.cases.length} casos</span>`:''}</div></div><button class="btn btn-primary" data-study-lesson="${esc(k)}">Abrir aula</button></article>`}).join('')}</div>`;
  document.getElementById('studyBackHome').onclick=()=>{studyReset();renderTrail()};
  el.querySelectorAll('[data-study-lesson]').forEach(b=>b.onclick=()=>{state.studyLessonKey=b.dataset.studyLesson;state.studyCaseId=null;renderTrail();window.scrollTo({top:0,behavior:'smooth'})});
}

function renderStudyLesson(el,key){
  const en=window.ECG_LANG==='en';
  const l=studyLesson(key);if(!l){state.studyLessonKey=null;return renderStudyModule(el,state.studyModuleKey)}
  const sections=(l.sections||[]).map(s=>`<div class="study-section-block"><h4>${esc(s[0])}</h4><ul>${(s[1]||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
  const videos=(l.videos||[]).map(v=>`<article class="study-video-card"><div class="video-icon">▶</div><div><small>${esc(v.channel)}</small><h4>${esc(v.title)}</h4><p>${esc(v.note)}</p><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">Assistir no YouTube ↗</a></div></article>`).join('');
  const refs=(l.references||[]).map(r=>`<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)} ↗</a></li>`).join('');
  const cases=(l.cases||[]).map((c,i)=>`<article class="card clinical-case-card"><div class="case-card-top"><span class="badge">Caso ${i+1}</span>${difficultyDots(c.difficulty)}</div><h4>${esc(c.title)}</h4><p>${esc(c.chief_complaint)}</p><button class="btn btn-secondary full" data-study-case="${esc(c.id)}">Abrir estudo de caso</button></article>`).join('');
  const pdfLang=window.ECG_LANG==='en'?'en':'pt';
  const pdfUrl=`assets/lessons/${pdfLang}/${encodeURIComponent(key)}.pdf`;
  el.innerHTML=`<div class="study-breadcrumb"><button class="btn btn-ghost" id="studyBackModule">← Voltar</button><div><span class="eyebrow">Nível ${l.level} • conteúdo liberado</span><h2>${esc(l.title)}</h2><p>${esc(l.summary)}</p></div></div><article class="card study-pdf-banner"><div><span class="eyebrow">${en?'In-depth material':'Material aprofundado'}</span><h3>${en?'Complete PDF guide':'Guia completo em PDF'}</h3><p>${en?'Expanded explanation with physiology, tracings, diagrams, differential diagnosis, clinical reasoning, pitfalls, and references. Guyton & Hall is the primary physiology reference.':'Explicação ampliada com fisiologia, traçados, diagramas, diferenciais, raciocínio clínico, pegadinhas e referências. Guyton & Hall é a referência fisiológica principal.'}</p></div><a class="btn btn-primary study-pdf-open" href="${esc(pdfUrl)}" target="_blank" rel="noopener noreferrer">${en?'Open in-depth PDF':'Abrir PDF aprofundado'} ↗</a></article><div class="study-detail-grid"><main><article class="card section"><h3>Objetivos de aprendizagem</h3><ul class="study-objectives">${(l.objectives||[]).map(x=>`<li>✓ ${esc(x)}</li>`).join('')}</ul>${sections}</article><article class="card section study-pitfalls"><h3>Pegadinhas e erros comuns</h3><ul>${(l.pitfalls||[]).map(x=>`<li>⚠ ${esc(x)}</li>`).join('')}</ul></article></main><aside><article class="card section"><h3>Vídeos selecionados</h3><p class="muted study-source-note">Os vídeos não são hospedados pelo ECG Lab. Os botões abrem o conteúdo no canal original, preservando autoria e atribuição.</p><div class="study-video-list">${videos||'<p class="muted">Nenhum vídeo externo nesta aula.</p>'}</div></article><article class="card section"><h3>Referências</h3><p class="muted study-source-note">O texto da aula é uma síntese autoral. Estas fontes são indicadas para aprofundamento e verificação.</p><ul class="study-reference-list">${refs||'<li>Conteúdo autoral do ECG Lab.</li>'}</ul></article></aside></div>${l.cases?.length?`<article class="card section cases-section"><div class="section-head"><div><h3>10 estudos de caso deste ritmo</h3><p class="muted">Anamnese, sinais vitais, exames, imagem/ECG e uma pegadinha leve em cada cenário.</p></div><span class="badge">${l.cases.length} casos</span></div><div class="clinical-cases-grid">${cases}</div></article>`:''}`;
  document.getElementById('studyBackModule').onclick=()=>{state.studyLessonKey=null;state.studyCaseId=null;renderTrail()};
  el.querySelectorAll('[data-study-case]').forEach(b=>b.onclick=()=>{state.studyCaseId=b.dataset.studyCase;renderStudyCase(el,l,state.studyCaseId);window.scrollTo({top:0,behavior:'smooth'})});
}

function caseReflectionStorageKey(id){return `ecgLabCaseReflection:${window.ECG_LANG||'pt-BR'}:${id}`}
function loadCaseReflection(id){try{return JSON.parse(localStorage.getItem(caseReflectionStorageKey(id))||'null')}catch{return null}}
function saveCaseReflection(id,data){try{localStorage.setItem(caseReflectionStorageKey(id),JSON.stringify(data))}catch{}}
function caseFeedbackEscList(items=[]){return (items||[]).map(x=>`<li>${esc(x)}</li>`).join('')}

function renderCaseAIFeedback(feedback,c){
  const box=document.getElementById('caseAiFeedback');if(!box)return;
  const score=Math.max(0,Math.min(100,Number(feedback?.score||0)));
  const scoreClass=score>=80?'excellent':score>=60?'good':score>=40?'partial':'review';
  const en=window.ECG_LANG==='en';
  box.className=`case-ai-feedback ${scoreClass}`;
  box.innerHTML=`<div class="case-ai-score"><div><span>${score}</span><small>/100</small></div><div><strong>${esc(feedback?.verdict||'')}</strong><p>${esc(feedback?.summary||'')}</p></div></div>
    <div class="case-ai-grid">
      <section><h5>✓ ${en?'What you got right':'O que você acertou'}</h5><ul>${caseFeedbackEscList(feedback?.strengths)}</ul></section>
      <section><h5>△ ${en?'What needs correction':'O que precisa ser corrigido'}</h5><ul>${caseFeedbackEscList(feedback?.corrections)}</ul></section>
      <section><h5>↳ ${en?'Why the error likely happened':'Por que o erro provavelmente aconteceu'}</h5><ul>${caseFeedbackEscList(feedback?.error_reasons)}</ul></section>
    </div>
    <section class="case-ai-reasoning"><h5>${en?'Correct reasoning, step by step':'Raciocínio correto, passo a passo'}</h5><ol>${caseFeedbackEscList(feedback?.correct_reasoning)}</ol></section>
    <section class="case-ai-model-answer"><h5>${en?'Model answer':'Resposta-modelo'}</h5><p>${esc(feedback?.ideal_answer||c?.reasoning||'')}</p></section>
    <section class="case-ai-next"><h5>${en?'What to look for next time':'O que observar na próxima vez'}</h5><ul>${caseFeedbackEscList(feedback?.next_time)}</ul></section>`;
  box.classList.remove('hidden');
}

function buildLocalCaseFeedback(c,answer){
  const a=answer.toLowerCase();const expected=String(c.answer||'').toLowerCase();
  const words=expected.replace(/[^a-záàâãéêíóôõúç0-9 ]/gi,' ').split(/\s+/).filter(w=>w.length>4);
  const match=words.filter(w=>a.includes(w)).length;const ratio=words.length?match/words.length:0;
  const score=Math.round(35+ratio*40);const en=window.ECG_LANG==='en';
  return {score,verdict:en?'Reference feedback — AI not connected':'Feedback de referência — IA não conectada',summary:en?'Your answer was compared with the case reference. Connect the AI backend for a full reasoning analysis.':'Sua resposta foi comparada com a referência do caso. Conecte o backend de IA para uma análise completa do raciocínio.',strengths:[en?'You attempted to interpret the case before revealing the answer.':'Você tentou interpretar o caso antes de revelar a resposta.'],corrections:[en?`Expected diagnosis: ${c.answer}.`:`Diagnóstico esperado: ${c.answer}.`],error_reasons:[en?'Without the AI backend, local mode cannot reliably infer why your reasoning went wrong.':'Sem o backend de IA, o modo local não consegue inferir com segurança por que seu raciocínio errou.'],correct_reasoning:[c.reasoning||c.learning_point||''],ideal_answer:c.reasoning||c.answer||'',next_time:[c.learning_point||c.trap||'']};
}

async function submitCaseReflection(c){
  const input=document.getElementById('caseReasoningInput');const btn=document.getElementById('caseAiSubmit');const status=document.getElementById('caseAiStatus');
  const answer=input?.value.trim()||'';const en=window.ECG_LANG==='en';if(answer.length<12){toast(en?'Write or dictate a little more before submitting.':'Escreva ou dite um pouco mais antes de enviar.');return}
  btn.disabled=true;status.textContent=en?'AI is reviewing your reasoning…':'A IA está revisando seu raciocínio…';
  try{
    if(!sb||!state.user||state.demo){const feedback=buildLocalCaseFeedback(c,answer);renderCaseAIFeedback(feedback,c);saveCaseReflection(c.id,{answer,feedback,at:Date.now()});status.textContent=en?'AI backend is not connected; showing reference feedback.':'Backend de IA não conectado; exibindo feedback de referência.';return}
    const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error(en?'Session unavailable.':'Sessão indisponível.');
    const payload={mode:'case-feedback',language:en?'en':'pt-BR',student_answer:answer,case_data:{title:c.title,chief_complaint:c.chief_complaint,anamnesis:c.anamnesis,medications:c.medications,vitals:c.vitals,physical_exam:c.physical_exam,labs:c.labs,imaging:c.imaging,question:c.question,expected_answer:c.answer,reference_reasoning:c.reasoning,trap:c.trap,learning_point:c.learning_point}};
    const res=await fetch(`${CFG.SUPABASE_URL}/functions/v1/ecg-tutor`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify(payload)});
    const data=await res.json();if(!res.ok)throw new Error(data.error||(en?'AI review failed.':'Falha na correção por IA.'));
    const feedback=data.feedback;if(!feedback)throw new Error(en?'The AI returned no structured feedback.':'A IA não retornou feedback estruturado.');
    renderCaseAIFeedback(feedback,c);saveCaseReflection(c.id,{answer,feedback,at:Date.now()});status.textContent=en?'Review complete.':'Correção concluída.';
  }catch(e){status.textContent=(en?'Could not review this answer: ':'Não foi possível corrigir esta resposta: ')+e.message}
  finally{btn.disabled=false}
}

function setupCaseVoiceAndAI(c){
  const input=document.getElementById('caseReasoningInput'),mic=document.getElementById('caseMic'),submit=document.getElementById('caseAiSubmit'),status=document.getElementById('caseAiStatus');if(!input||!submit)return;
  const previous=loadCaseReflection(c.id);if(previous?.answer)input.value=previous.answer;if(previous?.feedback)renderCaseAIFeedback(previous.feedback,c);
  submit.onclick=()=>submitCaseReflection(c);
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;const en=window.ECG_LANG==='en';
  if(!SR){if(mic){mic.disabled=true;mic.title=en?'Voice dictation is not supported by this browser.':'Ditado por voz não é suportado neste navegador.'}return}
  let recognition=null,listening=false,base='';
  mic.onclick=()=>{
    if(listening&&recognition){recognition.stop();return}
    recognition=new SR();recognition.lang=en?'en-US':'pt-BR';recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;base=input.value.trim();
    recognition.onstart=()=>{listening=true;mic.classList.add('listening');mic.innerHTML='■ <span>'+(en?'Stop':'Parar')+'</span>';status.textContent=en?'Listening… speak your interpretation.':'Ouvindo… explique sua interpretação.'};
    recognition.onresult=e=>{let finalText='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){const txt=e.results[i][0].transcript;if(e.results[i].isFinal)finalText+=txt+' ';else interim+=txt}if(finalText)base=(base?base+' ':'')+finalText.trim();input.value=(base+(interim?' '+interim:'')).trim()};
    recognition.onerror=e=>{status.textContent=(en?'Voice recognition error: ':'Erro no reconhecimento de voz: ')+(e.error||'unknown')};
    recognition.onend=()=>{listening=false;mic.classList.remove('listening');mic.innerHTML='🎙 <span>'+(en?'Dictate':'Ditar')+'</span>';if(!/error|erro/i.test(status.textContent))status.textContent=en?'Dictation stopped. Edit the text if needed, then submit.':'Ditado encerrado. Edite o texto se necessário e envie.'};
    try{recognition.start()}catch(e){status.textContent=e.message}
  };
}

function renderStudyCase(el,lesson,id){
  const c=(lesson.cases||[]).find(x=>x.id===id);if(!c){state.studyCaseId=null;return renderStudyLesson(el,lesson.key)}
  const en=window.ECG_LANG==='en';
  el.innerHTML=`<div class="study-breadcrumb"><button class="btn btn-ghost" id="caseBack">← ${esc(lesson.title)}</button><div><span class="eyebrow">Caso clínico • nível ${c.difficulty}</span><h2>${esc(c.title)}</h2><p>${esc(c.chief_complaint)}</p></div></div><div class="case-layout"><main><article class="card case-ecg-card"><div class="case-ecg-head"><div><strong>ECG do caso</strong><small>Lead II • traçado educacional vetorial</small></div><span class="badge">Sem resposta visível</span></div><img src="${esc(c.ecg_image)}" alt="ECG educacional do caso ${esc(c.title)}" class="case-ecg-image"></article><article class="card section"><h3>Anamnese e contexto</h3><div class="case-info-grid"><div><small>Queixa principal</small><p>${esc(c.chief_complaint)}</p></div><div><small>História</small><p>${esc(c.anamnesis)}</p></div><div><small>Medicações</small><p>${esc(c.medications)}</p></div><div><small>Sinais vitais</small><p>${esc(c.vitals)}</p></div></div><h4>Exame físico</h4><ul>${(c.physical_exam||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></article><article class="card section"><h3>Exames complementares</h3><div class="case-info-grid"><div><small>Laboratório</small><ul>${(c.labs||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><small>Imagem / outros exames</small><p>${esc(c.imaging)}</p></div></div></article></main><aside>
  <article class="card section case-reasoning-tool"><span class="eyebrow">${en?'Active recall':'Recordação ativa'}</span><h3>${en?'Explain your reasoning before seeing the answer':'Explique seu raciocínio antes de ver a resposta'}</h3><p>${en?'State the rhythm you think is present and explain which ECG and clinical findings support your conclusion.':'Diga qual ritmo você acredita estar presente e explique quais achados do ECG e do caso sustentam sua conclusão.'}</p><textarea id="caseReasoningInput" class="case-reasoning-input" maxlength="6000" placeholder="${en?'Example: I think this is… because the rhythm is…, the P waves…, the QRS… and the clinical context…':'Ex.: acredito que seja… porque o ritmo é…, as ondas P…, o QRS… e o contexto clínico…'}"></textarea><div class="case-reasoning-actions"><button class="btn btn-ghost case-mic" id="caseMic" type="button">🎙 <span>${en?'Dictate':'Ditar'}</span></button><button class="btn btn-primary" id="caseAiSubmit" type="button">✦ ${en?'Review with AI':'Corrigir com IA'}</button></div><small class="case-ai-privacy">${en?'Voice recognition is provided by your browser. ECG Lab sends the AI only the resulting text and the fictional case data.':'O reconhecimento de voz é fornecido pelo navegador. O ECG Lab envia à IA apenas o texto resultante e os dados do caso fictício.'}</small><div id="caseAiStatus" class="case-ai-status"></div><div id="caseAiFeedback" class="case-ai-feedback hidden"></div></article>
  <article class="card section case-question"><span class="eyebrow">Raciocínio</span><h3>${esc(c.question)}</h3><p>Analise o ECG antes de revelar a discussão. A resposta foi escondida para evitar reconhecimento por memória.</p><button class="btn btn-secondary full" id="revealCase">Revelar análise</button><div class="case-answer hidden" id="caseAnswer"><h4>${esc(c.answer)}</h4><p>${esc(c.reasoning)}</p><div class="case-trap"><strong>Pegadinha leve</strong><p>${esc(c.trap)}</p></div><div class="case-pearl"><strong>Ponto de aprendizagem</strong><p>${esc(c.learning_point)}</p></div></div></article><article class="card section"><strong>Nota educacional</strong><p class="muted">Caso fictício criado para treinamento. Não representa paciente real e não substitui avaliação clínica, protocolo institucional ou julgamento profissional.</p></article></aside></div>`;
  document.getElementById('caseBack').onclick=()=>{state.studyCaseId=null;renderStudyLesson(el,lesson.key)};
  document.getElementById('revealCase').onclick=e=>{document.getElementById('caseAnswer').classList.remove('hidden');e.currentTarget.disabled=true;e.currentTarget.textContent=en?'Analysis revealed':'Análise revelada'};
  setupCaseVoiceAndAI(c);
}
