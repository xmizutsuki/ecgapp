/* ECG Lab — stable floating contextual Tutor v2.
   Event-driven implementation: no MutationObserver, no Storage prototype patching,
   no app shell reflow. Context is refreshed only when needed. */
(function(){
  'use strict';

  const VERSION=2;
  const CONV_PREFIX=`ecgLabTutorConversations:v${VERSION}:`;
  const SIGNAL_PREFIX=`ecgLabTutorSignals:v${VERSION}:`;
  const MODE_PREFIX='ecgLabPracticeTutorMode:v2:';
  const ui={open:false,max:false,history:false,useContext:true,socratic:false,thinking:false,activeId:null,recognition:null};

  const st=()=>typeof state!=='undefined'?state:null;
  const supa=()=>typeof sb!=='undefined'?sb:null;
  const isEn=()=>window.ECG_LANG==='en';
  const T=()=>isEn()?{
    name:'AI Tutor',brand:'CardioTutor AI',ask:'Ask a question...',send:'Send',newChat:'+ New conversation',recent:'Recent conversations',context:'Context',useContext:'Use context from this screen',socratic:'Socratic mode',minimize:'Minimize',maximize:'Maximize',restore:'Restore',close:'Close',
    greeting:'Hi! I am your contextual ECG tutor. I can guide your reasoning without taking you away from your current activity.',noContext:'General ECG study',thinking:'Thinking…',voice:'Voice input',voiceUnsupported:'Voice recognition is not supported by this browser.',
    lockedTitle:'Tutor available after you finish this practice exam',lockedBody:'This practice exam is in Exam Mode. To protect the validity of your result, the Tutor is locked until the exam is completed.',studyMode:'Study Mode',examMode:'Exam Mode',modeHelp:'Choose before starting the practice exam. Study Mode allows the Tutor; Exam Mode locks it until completion.',
    preAnswer:'I can help you reach the answer without revealing it first. Start with rate and regularity, then inspect P waves, the P:QRS relationship, PR interval, and QRS width. What do you notice?',
    demo:'AI responses require Supabase and the ecg-tutor Edge Function. I can still guide you using the current educational context.',genericGuide:'Use a systematic sequence: rate → regularity → P waves → PR → QRS → ST-T → conclusion. Tell me what you see and I will help refine your reasoning.',
    error:'I could not access the tutor: ',newTitle:'New conversation',privacy:'Voice is transcribed by the browser; raw audio is not stored by ECG Lab.',
    qTrain:['Help me interpret this ECG','What finding should I look for?','Explain this rhythm','Give me a hint'],
    qQuestion:['Give me a hint','Explain the concept','How should I reason through this?','Why was my answer wrong?'],
    qCase:['Help with clinical reasoning','Which data matter most?','What should I assess first?','Analyze my reasoning'],
    qStudy:['Explain this simply','Go deeper on this topic','Give me an analogy','Create a question about this'],
    qGeneric:['Explain a concept','Quiz me on ECG interpretation','Review a rhythm with me']
  }:{
    name:'Tutor IA',brand:'CardioTutor IA',ask:'Digite sua pergunta...',send:'Enviar',newChat:'+ Nova conversa',recent:'Conversas recentes',context:'Contexto',useContext:'Usar contexto desta tela',socratic:'Modo Socrático',minimize:'Minimizar',maximize:'Maximizar',restore:'Restaurar',close:'Fechar',
    greeting:'Olá! Sou seu tutor contextual de ECG. Posso orientar seu raciocínio sem tirar você da atividade atual.',noContext:'Estudo geral de ECG',thinking:'Analisando…',voice:'Entrada por voz',voiceUnsupported:'O reconhecimento de voz não é suportado por este navegador.',
    lockedTitle:'Tutor disponível após finalizar o simulado',lockedBody:'Este simulado está no Modo Prova. Para preservar a validade do resultado, o Tutor fica bloqueado até a finalização.',studyMode:'Modo estudo',examMode:'Modo prova',modeHelp:'Escolha antes de iniciar o simulado. No Modo estudo o Tutor fica disponível; no Modo prova ele é bloqueado até a finalização.',
    preAnswer:'Posso ajudar você a chegar à resposta sem revelá-la antes da tentativa. Comece por frequência e regularidade; depois avalie onda P, relação P:QRS, intervalo PR e largura do QRS. O que você percebe?',
    demo:'As respostas por IA exigem Supabase e a Edge Function ecg-tutor. Ainda posso orientar usando o contexto educacional atual.',genericGuide:'Use uma sequência sistemática: frequência → regularidade → onda P → PR → QRS → ST-T → conclusão. Diga o que você observa e eu ajudo a refinar o raciocínio.',
    error:'Não consegui acessar o tutor: ',newTitle:'Nova conversa',privacy:'A voz é transcrita pelo navegador; o ECG Lab não armazena o áudio bruto.',
    qTrain:['Ajude-me a interpretar este ECG','Qual alteração devo procurar?','Explique este ritmo','Me dê uma dica'],
    qQuestion:['Me dê uma dica','Explique o conceito','Como devo raciocinar?','Por que minha resposta está errada?'],
    qCase:['Ajude no raciocínio clínico','Quais dados são mais importantes?','O que devo avaliar primeiro?','Analise meu raciocínio'],
    qStudy:['Explique de forma simples','Aprofunde este assunto','Faça uma analogia','Crie uma questão sobre isso'],
    qGeneric:['Explique um conceito','Faça uma pergunta de ECG para mim','Revise um ritmo comigo']
  };

  const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>st()?.user?.id||(st()?.demo?'demo-user':'guest');
  const convKey=()=>CONV_PREFIX+uid();
  const signalKey=()=>SIGNAL_PREFIX+uid();
  const modeKey=()=>MODE_PREFIX+uid();
  const uuid=()=>crypto?.randomUUID?.()||`tutor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const readJson=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??f}catch{return f}};
  const writeJson=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};

  function store(){const x=readJson(convKey(),null);return x&&Array.isArray(x.conversations)?x:{activeId:null,conversations:[]}}
  function saveStore(x){x.conversations=(x.conversations||[]).slice(0,20);writeJson(convKey(),x)}
  function ensureConversation(){const s=store();let c=s.conversations.find(x=>x.id===(ui.activeId||s.activeId));if(!c){const now=new Date().toISOString();c={id:uuid(),title:T().newTitle,created_at:now,updated_at:now,messages:[]};s.conversations.unshift(c);s.activeId=c.id;ui.activeId=c.id;saveStore(s)}else ui.activeId=c.id;return c}
  function mutateConversation(fn){const s=store();let c=s.conversations.find(x=>x.id===(ui.activeId||s.activeId));if(!c){ensureConversation();return mutateConversation(fn)}fn(c);c.updated_at=new Date().toISOString();s.activeId=c.id;s.conversations=[c,...s.conversations.filter(x=>x.id!==c.id)].slice(0,20);saveStore(s)}
  function addMessage(role,text,meta={}){mutateConversation(c=>{c.messages=(c.messages||[]).concat({role,text:String(text),at:new Date().toISOString(),...meta}).slice(-60);if((c.title===T().newTitle||c.title==='New conversation'||c.title==='Nova conversa')&&role==='user')c.title=String(text).replace(/\s+/g,' ').slice(0,52)})}
  function startNew(){const s=store(),now=new Date().toISOString(),c={id:uuid(),title:T().newTitle,created_at:now,updated_at:now,messages:[]};s.activeId=c.id;s.conversations.unshift(c);ui.activeId=c.id;saveStore(s);ui.history=false;refreshPanel()}
  function openConversation(id){const s=store(),c=s.conversations.find(x=>x.id===id);if(!c)return;s.activeId=id;ui.activeId=id;saveStore(s);ui.history=false;refreshPanel()}

  function signals(){const x=readJson(signalKey(),[]);return Array.isArray(x)?x:[]}
  function recordSignal(kind,ctx){const row={id:uuid(),created_at:new Date().toISOString(),user_id:uid(),help_type:kind,activity_type:ctx.activityType||'general',activity_id:ctx.activityId||null,question_id:ctx.questionId||null,topic:ctx.topic||null,category:ctx.category||null,answer_submitted:!!ctx.answerSubmitted,socratic:!!ui.socratic};const list=signals();list.unshift(row);writeJson(signalKey(),list.slice(0,250));try{window.dispatchEvent(new CustomEvent('ecg:tutor-signal',{detail:row}))}catch{}const client=supa();if(client&&st()?.user&&!st()?.demo)Promise.resolve(client.from('tutor_learning_signals').insert(row)).catch(()=>{});return row}

  const currentModePreference=()=>localStorage.getItem(modeKey())||'exam';
  const setModePreference=v=>{localStorage.setItem(modeKey(),v==='study'?'study':'exam');syncModeChooser()};
  const sessions=prefix=>readJson(prefix+uid(),[]);
  const latestActive=prefix=>sessions(prefix).filter(s=>s?.status==='in_progress').sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at))[0]||null;
  const optionLabels=q=>(q?.options||[]).map(o=>Array.isArray(o)?String(o[0]):String(o?.label??o));
  function correctLabel(q){const o=(q?.options||[]).find(x=>Array.isArray(x)?!!x[1]:!!x?.is_correct);return o?(Array.isArray(o)?String(o[0]):String(o.label||'')):null}

  function trainingContext(){
    if(st()?.page!=='treinar')return null;
    if(document.querySelector('.cat-runner')){
      const s=latestActive('ecgLabTraining:v1:');
      if(s){const qid=String(s.current_question_id||''),snap=s.current_question_snapshot||{},ans=(s.answers||[]).find(a=>String(a.question_id)===qid),submitted=!!ans;return {activityType:'quick_training',activityId:s.id,currentModule:'ECG Training',questionId:qid,questionText:snap.prompt||'',alternatives:(snap.options||[]).map(o=>o.label),selectedAnswer:submitted?snap.options?.[ans.selected_answer]?.label:null,answerSubmitted:submitted,correctAnswer:submitted?snap.options?.[ans.correct_answer]?.label:null,explanation:submitted?snap.explanation:null,ecgData:{imageUrl:snap.image_url||'',lead:'II',synthetic:true},topic:snap.category||'',category:snap.category||'',difficulty:snap.difficulty||null,sessionProgress:{current:(s.answers||[]).length+1,total:s.total_questions},label:`${isEn()?'ECG Training':'Treino ECG'} • ${isEn()?'Question':'Questão'} ${(s.answers||[]).length+1}/${s.total_questions}`}}
    }
    if(document.querySelector('#treinar .training,#treinar .adaptive-panel')&&typeof currentAdaptiveQuestion==='function'){
      const q=currentAdaptiveQuestion(),ecg=q&&typeof caseById==='function'?caseById(q.ecg_case_id):null,submitted=!!st()?.adaptive?.answeredCurrent;
      if(q)return {activityType:'quick_training',activityId:'adaptive-live',currentModule:'ECG Training',questionId:String(q.id),questionText:q.prompt||'',alternatives:optionLabels(q),selectedAnswer:Number.isInteger(st()?.selectedAnswer)?optionLabels(q)[st().selectedAnswer]:null,answerSubmitted:submitted,correctAnswer:submitted?correctLabel(q):null,explanation:submitted?(q.explanation||ecg?.explanation||null):null,ecgData:{imageUrl:ecg?.image_url||'',lead:'II',synthetic:true},topic:q.category||ecg?.category||'',category:q.category||ecg?.category||'',difficulty:q.difficulty||ecg?.difficulty||null,sessionProgress:{current:(st()?.adaptive?.answered||0)+1,total:null},label:`${isEn()?'ECG Training':'Treino ECG'} • ${isEn()?'Question':'Questão'} ${(st()?.adaptive?.answered||0)+1}`}
    }
    return {activityType:'training_home',currentModule:'ECG Training',answerSubmitted:true,label:isEn()?'ECG Training':'Treino ECG'};
  }

  function simulationContext(){
    if(st()?.page!=='simulados')return null;
    const s=latestActive('ecgLabSimulations:v4:');
    if(!s||!document.querySelector('#simulados .sim-runner,#simulados [data-sim-answer],#simulados .sim-question-shell'))return {activityType:'simulation_home',currentModule:'Practice Exams',answerSubmitted:true,label:isEn()?'Practice Exams':'Simulados'};
    const idx=Number(s.current_question_index)||0,qid=String((s.question_ids||[])[idx]||''),snap=s.question_snapshots?.[qid]||{},a=s.answers?.[qid],submitted=Number.isInteger(a?.selected_answer),mode=s.tutor_mode||currentModePreference();
    return {activityType:'simulation',activityId:s.id,currentModule:'Practice Exams',questionId:qid,questionText:snap.prompt||'',alternatives:(snap.options||[]).map(o=>o.label),selectedAnswer:submitted?snap.options?.[a.selected_answer]?.label:null,answerSubmitted:submitted,correctAnswer:submitted&&mode==='study'?snap.options?.find(o=>o.correct)?.label:null,explanation:submitted&&mode==='study'?snap.explanation:null,ecgData:{imageUrl:snap.image_url||'',lead:'II',synthetic:true},topic:snap.category||'',category:snap.category||'',sessionProgress:{current:idx+1,total:s.total_questions},examMode:mode,locked:mode==='exam'&&s.status==='in_progress',label:`${isEn()?'Practice Exam':'Simulado'} • ${isEn()?'Question':'Questão'} ${idx+1}/${s.total_questions}`};
  }

  function studyContext(){
    if(st()?.page!=='trilha')return null;
    const data=window.ECG_STUDY_CONTENT||{},lesson=st()?.studyLessonKey?data.lessons?.[st().studyLessonKey]:null,c=lesson&&st()?.studyCaseId?(lesson.cases||[]).find(x=>String(x.id)===String(st().studyCaseId)):null;
    if(c){const answer=document.getElementById('caseAnswer'),revealed=!!answer&&!answer.classList.contains('hidden');return {activityType:'clinical_case',activityId:st().studyLessonKey,caseId:c.id,currentModule:'Study Path',caseData:{title:c.title,chiefComplaint:c.chief_complaint,anamnesis:c.anamnesis,medications:c.medications,vitals:c.vitals,physicalExam:c.physical_exam,labs:c.labs,imaging:c.imaging,question:c.question,ecgImage:c.ecg_image},answerSubmitted:revealed,correctAnswer:revealed?c.answer:null,explanation:revealed?c.reasoning:null,topic:lesson?.title||'',ecgData:{imageUrl:c.ecg_image||'',lead:'II',synthetic:true},label:`${isEn()?'Clinical Case':'Estudo de Caso'} • ${c.title}`}}
    if(lesson)return {activityType:'study_lesson',activityId:st().studyLessonKey,currentModule:'Study Path',answerSubmitted:true,topic:lesson.title,lesson:{title:lesson.title,summary:lesson.summary,objectives:lesson.objectives},label:`${isEn()?'Study Path':'Trilha de Estudos'} • ${lesson.title}`};
    return {activityType:'study_home',currentModule:'Study Path',answerSubmitted:true,label:isEn()?'Study Path':'Trilha de Estudos'};
  }

  function buildContext(){const c=trainingContext()||simulationContext()||studyContext()||{activityType:st()?.page||'general',currentModule:st()?.page||'ECG Lab',answerSubmitted:true,label:T().noContext};c.language=window.ECG_LANG||'pt-BR';return c}
  function quickActions(ctx){if(ctx.activityType==='clinical_case')return T().qCase;if(ctx.activityType==='study_lesson')return T().qStudy;if(ctx.activityType==='quick_training')return ctx.answerSubmitted?T().qQuestion:T().qTrain;if(ctx.activityType==='simulation')return T().qQuestion;return T().qGeneric}
  const revealIntent=text=>/\b(qual (é|e) a resposta|qual alternativa|resposta correta|me diga a resposta|correct answer|which option|give me the answer|what is the answer)\b/i.test(text);
  function helpKind(text){if(/dica|hint/i.test(text))return'hint';if(/errad|wrong/i.test(text))return'error_review';if(/racioc|reason/i.test(text))return'reasoning';if(/interpret|analys|analis/i.test(text))return'interpretation';return'concept'}
  function sanitizeContext(c){const x=JSON.parse(JSON.stringify(c||{}));if(!x.answerSubmitted){delete x.correctAnswer;delete x.explanation}return x}

  function mount(){
    if(document.getElementById('floatingTutorV2Root'))return;
    const root=document.createElement('div');root.id='floatingTutorV2Root';root.innerHTML=`<button id="ft2Fab" class="ft2-fab" type="button" aria-label="${safe(T().name)}"><span>✦</span><b>${safe(T().name)}</b></button><aside id="ft2Panel" class="ft2-panel" aria-hidden="true"><header class="ft2-head"><div><span class="ft2-mark">✦</span><div><strong id="ft2Brand"></strong><small id="ft2Context"></small></div></div><nav><button id="ft2HistoryBtn" type="button">☰</button><button id="ft2MinBtn" type="button">—</button><button id="ft2MaxBtn" type="button">□</button><button id="ft2CloseBtn" type="button">×</button></nav></header><section id="ft2Locked" class="ft2-locked hidden"></section><section id="ft2Normal"><div class="ft2-controls"><label><input id="ft2UseContext" type="checkbox"> <span id="ft2UseContextLabel"></span></label><label><input id="ft2Socratic" type="checkbox"> <span id="ft2SocraticLabel"></span></label></div><div id="ft2Actions" class="ft2-actions"></div><div id="ft2Log" class="ft2-chat"></div><footer class="ft2-compose"><textarea id="ft2Input" rows="1"></textarea><button id="ft2Voice" type="button">🎙️</button><button id="ft2Send" type="button" class="btn btn-primary">➤</button></footer><div id="ft2Privacy" class="ft2-privacy"></div></section><section id="ft2History" class="ft2-history"></section></aside>`;document.body.appendChild(root);
    document.getElementById('ft2Fab').onclick=openPanel;
    document.getElementById('ft2CloseBtn').onclick=closePanel;
    document.getElementById('ft2MinBtn').onclick=closePanel;
    document.getElementById('ft2MaxBtn').onclick=()=>{ui.max=!ui.max;document.getElementById('ft2Panel')?.classList.toggle('max',ui.max);document.getElementById('ft2MaxBtn').textContent=ui.max?'❐':'□'};
    document.getElementById('ft2HistoryBtn').onclick=()=>{ui.history=!ui.history;renderHistory()};
    document.getElementById('ft2UseContext').onchange=e=>{ui.useContext=!!e.target.checked;localStorage.setItem('ecgLabTutorUseContext',ui.useContext?'1':'0')};
    document.getElementById('ft2Socratic').onchange=e=>{ui.socratic=!!e.target.checked;localStorage.setItem('ecgLabTutorSocratic',ui.socratic?'1':'0')};
    document.getElementById('ft2Send').onclick=send;
    document.getElementById('ft2Input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}};
    document.getElementById('ft2Voice').onclick=startVoice;
  }

  function openPanel(){ensureConversation();ui.open=true;refreshPanel();const p=document.getElementById('ft2Panel');p?.classList.add('show');p?.setAttribute('aria-hidden','false');document.getElementById('ft2Fab')?.classList.add('open');setTimeout(()=>document.getElementById('ft2Input')?.focus(),50)}
  function closePanel(){ui.open=false;ui.history=false;const p=document.getElementById('ft2Panel');p?.classList.remove('show');p?.setAttribute('aria-hidden','true');document.getElementById('ft2Fab')?.classList.remove('open');document.getElementById('ft2History')?.classList.remove('show')}

  function refreshPanel(){
    if(!document.getElementById('floatingTutorV2Root'))mount();
    const ctx=buildContext(),locked=!!ctx.locked;
    document.getElementById('ft2Brand').textContent=T().brand;
    document.getElementById('ft2Context').textContent=`${T().context}: ${ctx.label||T().noContext}`;
    document.getElementById('ft2UseContext').checked=ui.useContext;document.getElementById('ft2UseContextLabel').textContent=T().useContext;
    document.getElementById('ft2Socratic').checked=ui.socratic;document.getElementById('ft2SocraticLabel').textContent=T().socratic;
    document.getElementById('ft2Input').placeholder=T().ask;document.getElementById('ft2Privacy').textContent=T().privacy;
    document.getElementById('ft2Voice').title=T().voice;document.getElementById('ft2CloseBtn').title=T().close;document.getElementById('ft2MinBtn').title=T().minimize;document.getElementById('ft2MaxBtn').title=ui.max?T().restore:T().maximize;
    const lockedBox=document.getElementById('ft2Locked'),normal=document.getElementById('ft2Normal');lockedBox.classList.toggle('hidden',!locked);normal.classList.toggle('hidden',locked);
    if(locked)lockedBox.innerHTML=`<div>🔒</div><h3>${safe(T().lockedTitle)}</h3><p>${safe(T().lockedBody)}</p><small>${safe(ctx.label||'')}</small>`;
    else{const actions=quickActions(ctx);const box=document.getElementById('ft2Actions');box.innerHTML=actions.map(a=>`<button type="button" data-ft2-quick="${safe(a)}">${safe(a)}</button>`).join('');box.querySelectorAll('[data-ft2-quick]').forEach(b=>b.onclick=()=>{const inp=document.getElementById('ft2Input');inp.value=b.dataset.ft2Quick;send()})}
    renderMessages();renderHistory();
  }

  function renderMessages(){const c=ensureConversation(),log=document.getElementById('ft2Log');if(!log)return;const msgs=c.messages||[];log.innerHTML=msgs.length?msgs.map(m=>`<div class="ft2-msg ${m.role==='user'?'user':'bot'}"><div>${safe(m.text).replace(/\n/g,'<br>')}</div><small>${new Intl.DateTimeFormat(isEn()?'en-US':'pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(m.at))}</small></div>`).join(''):`<div class="ft2-msg bot"><div>${safe(T().greeting)}</div></div>`;if(ui.thinking)log.insertAdjacentHTML('beforeend',`<div class="ft2-msg bot thinking"><span></span><span></span><span></span><em>${safe(T().thinking)}</em></div>`);log.scrollTop=log.scrollHeight}
  function renderHistory(){const box=document.getElementById('ft2History');if(!box)return;const s=store();box.innerHTML=`<div class="ft2-history-head"><strong>${safe(T().recent)}</strong><button type="button" id="ft2HistoryClose">×</button></div><button type="button" class="btn btn-primary full" id="ft2NewConversation">${safe(T().newChat)}</button><div class="ft2-history-list">${(s.conversations||[]).map(c=>`<button type="button" data-ft2-conv="${safe(c.id)}" class="${c.id===ui.activeId?'active':''}"><strong>${safe(c.title||T().newTitle)}</strong><small>${new Intl.DateTimeFormat(isEn()?'en-US':'pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(c.updated_at||c.created_at))}</small></button>`).join('')}</div>`;box.classList.toggle('show',ui.history);document.getElementById('ft2HistoryClose').onclick=()=>{ui.history=false;box.classList.remove('show')};document.getElementById('ft2NewConversation').onclick=startNew;box.querySelectorAll('[data-ft2-conv]').forEach(b=>b.onclick=()=>openConversation(b.dataset.ft2Conv))}

  async function send(){
    if(ui.thinking)return;const inp=document.getElementById('ft2Input'),text=inp?.value.trim();if(!text)return;const ctx=buildContext();if(ctx.locked)return;
    addMessage('user',text,{context:ctx.label});recordSignal(helpKind(text),ctx);inp.value='';renderMessages();
    if(ui.useContext&&!ctx.answerSubmitted&&revealIntent(text)){addMessage('assistant',T().preAnswer,{guard:'pre-answer'});renderMessages();return}
    const client=supa();
    if(!client||!st()?.user||st()?.demo){const reply=ui.useContext&&!ctx.answerSubmitted?T().preAnswer:`${T().demo} ${T().genericGuide}`;setTimeout(()=>{addMessage('assistant',reply,{demo:true});renderMessages()},120);return}
    ui.thinking=true;renderMessages();
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try{const {data:{session}}=await client.auth.getSession();if(!session?.access_token)throw new Error(isEn()?'No authenticated session.':'Sessão não autenticada.');const c=ensureConversation(),history=(c.messages||[]).slice(-10,-1).map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.text})),payload={message:text,language:window.ECG_LANG||'pt-BR',socratic_mode:ui.socratic,history,context:ui.useContext?sanitizeContext(ctx):null};const res=await fetch(`${CFG.SUPABASE_URL}/functions/v1/ecg-tutor`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify(payload),signal:controller.signal}),data=await res.json();if(!res.ok)throw new Error(data.error||(isEn()?'Tutor request failed':'Falha no Tutor'));addMessage('assistant',data.reply||(isEn()?'No response was returned.':'Nenhuma resposta foi retornada.'),{context:ctx.label})}catch(e){addMessage('assistant',T().error+(e?.name==='AbortError'?(isEn()?'request timed out':'tempo limite da solicitação excedido'):(e?.message||String(e))),{error:true})}finally{clearTimeout(timer);ui.thinking=false;renderMessages()}
  }

  function startVoice(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast?.(T().voiceUnsupported);return}if(ui.recognition){try{ui.recognition.stop()}catch{}ui.recognition=null;return}const r=new SR();ui.recognition=r;r.lang=isEn()?'en-US':'pt-BR';r.interimResults=false;r.continuous=false;const b=document.getElementById('ft2Voice');b?.classList.add('listening');if(b)b.textContent='●';r.onresult=e=>{const text=e.results?.[0]?.[0]?.transcript||'',inp=document.getElementById('ft2Input');if(inp){inp.value=text;inp.focus()}};r.onerror=()=>toast?.(T().voiceUnsupported);r.onend=()=>{ui.recognition=null;const x=document.getElementById('ft2Voice');x?.classList.remove('listening');if(x)x.textContent='🎙️'};r.start()}

  function syncModeChooser(){const modal=document.querySelector('#simModalRoot .sim-new-modal');if(!modal||modal.querySelector('.ft2-exam-mode'))return;const actions=modal.querySelector('.sim-modal-actions');if(!actions)return;const pref=currentModePreference(),wrap=document.createElement('div');wrap.className='ft2-exam-mode';wrap.innerHTML=`<div><strong>${safe(T().studyMode)} / ${safe(T().examMode)}</strong><small>${safe(T().modeHelp)}</small></div><div class="ft2-segment"><button type="button" data-ft2-mode="study" class="${pref==='study'?'active':''}">${safe(T().studyMode)}</button><button type="button" data-ft2-mode="exam" class="${pref==='exam'?'active':''}">${safe(T().examMode)}</button></div>`;actions.before(wrap);wrap.querySelectorAll('[data-ft2-mode]').forEach(b=>b.onclick=()=>{setModePreference(b.dataset.ft2Mode);wrap.querySelectorAll('[data-ft2-mode]').forEach(x=>x.classList.toggle('active',x.dataset.ft2Mode===b.dataset.ft2Mode))})}
  function stampLatestSimulationMode(mode){try{const key=`ecgLabSimulations:v4:${uid()}`,list=readJson(key,[]);if(!Array.isArray(list))return;const active=list.filter(s=>s?.status==='in_progress').sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at))[0];if(!active||active.tutor_mode)return;active.tutor_mode=mode==='study'?'study':'exam';writeJson(key,list)}catch{}}

  function boot(){
    ui.useContext=localStorage.getItem('ecgLabTutorUseContext')!=='0';ui.socratic=localStorage.getItem('ecgLabTutorSocratic')==='1';mount();
    document.addEventListener('click',e=>{
      const target=e.target?.closest?.('button,a,[data-page]');if(!target)return;
      const starting=target.id==='simNewStart';const mode=starting?currentModePreference():null;
      setTimeout(()=>{syncModeChooser();if(starting)stampLatestSimulationMode(mode);if(ui.open)refreshPanel()},0);
    },true);
    window.addEventListener('ecg:training-answer',()=>{if(ui.open)refreshPanel()});
    window.addEventListener('ecg:simulation-answer',()=>{if(ui.open)refreshPanel()});
    window.addEventListener('ecg:casecoach-feedback',()=>{if(ui.open)refreshPanel()});
    syncModeChooser();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.ECG_TUTOR={open:openPanel,close:closePanel,newConversation:startNew,getContext:buildContext,getLearningSignals:signals,setPracticeMode:setModePreference};
})();
