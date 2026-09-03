(function(){
  const STORAGE_KEY='ecgLabLanguage';
  const selected=localStorage.getItem(STORAGE_KEY);
  window.ECG_LANG = selected || 'pt-BR';

  const exact = {
    // Core UI
    'Treine. Entenda. Domine.':'Train. Understand. Master.',
    'Treinar ECG':'ECG Training','Trilha de estudo':'Study Path','Simulados':'Practice Exams','Tutor IA':'AI Tutor',
    'Início':'Home','Treinar':'Train','Simulado':'Exam','Treino rápido':'Quick Training','Sair':'Sign out','Entrar':'Sign in',
    'Treinamento estruturado de eletrocardiografia.':'Structured electrocardiography training.',
    'Seu progresso e próximos passos.':'Your progress and next steps.',
    'Interpretação guiada com feedback imediato.':'Guided interpretation with immediate feedback.',
    'Do básico ao avançado em módulos progressivos.':'From basic to advanced through progressive modules.',
    'Avalie seu domínio com questões cronometradas.':'Assess your knowledge with timed questions.',
    'Tire dúvidas sobre conceitos e raciocínio eletrocardiográfico.':'Ask questions about ECG concepts and interpretation.',
    'Painel administrativo':'Admin Panel','Gerencie ECGs e conteúdo educacional.':'Manage ECGs and educational content.',
    'Aprenda ECG interpretando de verdade.':'Learn ECG by actually interpreting it.',
    'Começar treino':'Start training','Fazer simulado':'Take a practice exam','Precisão':'Accuracy','acertos acumulados':'cumulative correct answers',
    'ECGs estudados':'ECGs studied','traçados vetoriais disponíveis':'vector tracings available','Revisões':'Reviews','itens recomendados':'recommended items',
    'progresso de estudo':'study progress','Continuar estudando':'Continue studying','trilha ativa':'active path','Mapa de habilidades':'Skill map',
    'Frequência':'Rate','Ritmo':'Rhythm','Onda P':'P wave','Bloqueios':'Blocks','Regularidade, atividade atrial e diferenciais':'Regularity, atrial activity and differentials',
    'Ondas F e condução AV':'Flutter waves and AV conduction','PR, condução e dissociação':'PR, conduction and dissociation',
    'aprendizagem adaptativa':'adaptive learning','treino adaptativo':'adaptive training','questão atual':'current question','sequência':'streak',
    'Reiniciar treino':'Restart training','ECG adaptativo':'Adaptive ECG','dificuldade selecionada automaticamente':'difficulty selected automatically',
    'Ajustar':'Fit','Tela cheia':'Fullscreen','Dica':'Hint','Questão':'Question','Confirmar':'Confirm','Próxima questão adaptativa':'Next adaptive question',
    'Analise o traçado antes de responder. Não é possível pular a questão; a próxima será escolhida com base neste resultado.':'Analyze the tracing before answering. You cannot skip the question; the next item will be selected based on this result.',
    'Traçado educacional vetorial':'Educational vector tracing','SVG em alta definição':'High-definition SVG','O diagnóstico só é revelado após responder':'The diagnosis is revealed only after you answer',
    'Lead II • dificuldade selecionada automaticamente':'Lead II • automatically selected difficulty',
    'As questões são misturadas entre todos os ritmos. O algoritmo começa com casos fáceis e aumenta ou reduz a dificuldade conforme seus acertos, erros e áreas de maior dificuldade.':'Questions are mixed across all rhythms. The algorithm starts with easier cases and raises or lowers difficulty according to your correct answers, errors, and weaker areas.',
    'Biblioteca educacional indisponível':'Educational library unavailable','Nenhuma questão foi carregada.':'No questions were loaded.',
    'Traçado indisponível.':'Tracing unavailable.','Recarregue a página.':'Reload the page.','Resposta correta':'Correct answer','Revise este ponto':'Review this point',
    'Correto! +10 XP':'Correct! +10 XP','Resposta registrada para revisão.':'Answer saved for review.',
    // Adaptive labels
    'Fundamental':'Foundation','Básico':'Basic','Intermediário':'Intermediate','Avançado':'Advanced','Especialista':'Expert',
    // Study path
    'Trilha 100% liberada':'100% unlocked study path','Estude na ordem que fizer sentido para você.':'Study in the order that works best for you.',
    'Todo o conteúdo está disponível desde o início. Cada aula combina resumo autoral, critérios de ECG, armadilhas, referências, vídeos externos e estudos de caso.':'All content is available from the beginning. Each lesson combines original summaries, ECG criteria, pitfalls, references, external videos, and clinical cases.',
    'módulos':'modules','aulas':'lessons','casos clínicos':'clinical cases','Nível':'Level','liberado':'unlocked','livre':'open','Explorar':'Explore','Abrir aula':'Open lesson',
    'Uso de fontes e direitos autorais':'Sources and copyright','Objetivos de aprendizagem':'Learning objectives','Pegadinhas e erros comuns':'Pitfalls and common errors',
    'Vídeos selecionados':'Selected videos','Referências':'References','Assistir no YouTube':'Watch on YouTube','Nenhum vídeo externo nesta aula.':'No external video in this lesson.',
    'Conteúdo autoral do ECG Lab.':'Original ECG Lab content.','10 estudos de caso deste ritmo':'10 clinical cases for this rhythm',
    'Anamnese, sinais vitais, exames, imagem/ECG e uma pegadinha leve em cada cenário.':'History, vital signs, tests, imaging/ECG, and a mild trick in each scenario.',
    'Abrir estudo de caso':'Open case study','Voltar':'Back','Caso clínico':'Clinical case','ECG do caso':'Case ECG','traçado educacional vetorial':'educational vector tracing',
    'Sem resposta visível':'Answer hidden','Anamnese e contexto':'History and context','Queixa principal':'Chief complaint','História':'History','Medicações':'Medications','Sinais vitais':'Vital signs',
    'Exame físico':'Physical examination','Exames complementares':'Additional tests','Laboratório':'Laboratory','Imagem / outros exames':'Imaging / other tests','Raciocínio':'Reasoning',
    'Revelar análise':'Reveal analysis','Pegadinha leve':'Mild trick','Ponto de aprendizagem':'Learning point','Nota educacional':'Educational note','Análise revelada':'Analysis revealed',
    'Analise o ECG antes de revelar a discussão. A resposta foi escondida para evitar reconhecimento por memória.':'Analyze the ECG before revealing the discussion. The answer is hidden to prevent recognition by memory alone.',
    'Caso fictício criado para treinamento. Não representa paciente real e não substitui avaliação clínica, protocolo institucional ou julgamento profissional.':'Fictitious case created for training. It does not represent a real patient and does not replace clinical assessment, institutional protocols, or professional judgment.',
    'Os vídeos não são hospedados pelo ECG Lab. Os botões abrem o conteúdo no canal original, preservando autoria e atribuição.':'Videos are not hosted by ECG Lab. Buttons open the content on the original channel, preserving authorship and attribution.',
    'O texto da aula é uma síntese autoral. Estas fontes são indicadas para aprofundamento e verificação.':'Lesson text is an original synthesis. These sources are provided for further study and verification.',
    // Auth
    'Aprenda interpretando':'Learn by interpreting','Criar conta':'Create account','Nome':'Name','Seu nome':'Your name','Senha':'Password','Entrar em modo demonstração':'Enter demo mode',
    'O login real funciona após configurar o Supabase em':'Real sign-in works after configuring Supabase in','Usuário Demo':'Demo User','Modo demonstração ativado.':'Demo mode enabled.',
    'Conta criada e conectada.':'Account created and signed in.','Conta criada. Confirme o e-mail para entrar.':'Account created. Confirm your email to sign in.','Sessão encerrada.':'Signed out.',
    'Carregando biblioteca de ECG...':'Loading ECG library...','114 traçados vetoriais em alta definição':'114 high-definition vector tracings',
    // Rhythm names
    'Ritmo sinusal':'Sinus rhythm','Bradicardia sinusal':'Sinus bradycardia','Taquicardia sinusal':'Sinus tachycardia','Arritmia sinusal':'Sinus arrhythmia',
    'Fibrilação atrial':'Atrial fibrillation','Flutter atrial':'Atrial flutter','Taquicardia supraventricular':'Supraventricular tachycardia','TSV paroxística':'Paroxysmal SVT',
    'Ritmo estimulado por marcapasso':'Paced rhythm','Bigeminismo ventricular':'Ventricular bigeminy','Trigeminismo ventricular':'Ventricular trigeminy',
    'Extrassístole ventricular (PVC)':'Premature ventricular complex (PVC)','Extrassístole atrial (PAC)':'Premature atrial complex (PAC)',
    'BAV de 1º grau':'First-degree AV block','BAV de 2º grau — Mobitz I':'Second-degree AV block — Mobitz I','BAV de 2º grau — Mobitz II':'Second-degree AV block — Mobitz II','BAV de 3º grau':'Third-degree AV block',
    'Taquicardia ventricular':'Ventricular tachycardia','Fibrilação ventricular':'Ventricular fibrillation','Taquicardia ventricular monomórfica':'Monomorphic ventricular tachycardia',
    'BAV de 3º grau (bloqueio AV completo)':'Third-degree AV block (complete heart block)','BAV Mobitz I':'Mobitz I AV block','BAV Mobitz II':'Mobitz II AV block',
    'Assistolia':'Asystole','Ritmo sinusal em frequência normal':'Normal-rate sinus rhythm','Fibrilação atrial sem estimulação':'Atrial fibrillation without pacing',
    'Bloqueio de ramo esquerdo sem estimulação':'Left bundle branch block without pacing','Extrassístoles isoladas sem padrão':'Isolated premature beats without a pattern',
    // Common ECG questions
    'Qual é o ritmo predominante neste ECG?':'What is the predominant rhythm on this ECG?','Qual padrão de ritmo está presente neste ECG?':'What rhythm pattern is present on this ECG?',
    'Qual é o ritmo mais compatível com este ECG?':'Which rhythm best matches this ECG?','Qual é a classificação de ritmo mais apropriada?':'What is the most appropriate rhythm classification?',
    'Qual padrão de estimulação está presente neste ECG?':'What pacing pattern is present on this ECG?','Qual padrão de ectopia está presente?':'What ectopic pattern is present?',
    'Que tipo de ectopia está demonstrada neste ECG?':'What type of ectopy is shown on this ECG?','Qual distúrbio de condução AV está presente?':'Which AV conduction disturbance is present?',
    'Qual grau de bloqueio atrioventricular está presente?':'What degree of atrioventricular block is present?','Qual grau de bloqueio AV está presente?':'What degree of AV block is present?',
    'Qual é o ritmo mais compatível?':'Which rhythm is most compatible?','Qual é o ritmo predominante e quais dados sustentam sua interpretação?':'What is the predominant rhythm, and which findings support your interpretation?',
    // Modules
    'Fundamentos':'Fundamentals','Ritmos sinusais':'Sinus rhythms','Arritmias atriais e SVT':'Atrial arrhythmias and SVT','Ectopias':'Ectopy','Bloqueios AV':'AV blocks','Ritmos ventriculares':'Ventricular rhythms','Marcapasso':'Pacemaker','Isquemia e ST-T':'Ischemia and ST-T','Casos clínicos completos':'Complete clinical cases',
    'Papel, grade, ondas, intervalos e método sistemático.':'ECG paper, grid, waves, intervals, and a systematic method.','Sinusal, bradicardia, taquicardia e arritmia sinusal.':'Sinus rhythm, bradycardia, tachycardia, and sinus arrhythmia.',
    'FA, flutter, TSV e TSV paroxística.':'AF, atrial flutter, SVT, and paroxysmal SVT.','PAC, PVC, bigeminismo e trigeminismo.':'PACs, PVCs, bigeminy, and trigeminy.',
    'BAV de 1º grau, Mobitz I, Mobitz II e BAV completo.':'First-degree AV block, Mobitz I, Mobitz II, and complete heart block.','Taquicardia ventricular e fibrilação ventricular.':'Ventricular tachycardia and ventricular fibrillation.',
    'Pacing, captura e leitura do ritmo estimulado.':'Pacing, capture, and interpretation of paced rhythms.','ST, T, território e armadilhas de interpretação.':'ST, T waves, territories, and interpretation pitfalls.',
    '190 casos distribuídos entre todos os ritmos, com pegadinhas leves.':'190 cases across all rhythms, with mild traps.',
  };

  const phrasePairs = [
    // high-value medical phrases first
    ['ritmo regular','regular rhythm'],['ritmo irregular','irregular rhythm'],['irregularmente irregular','irregularly irregular'],['onda P','P wave'],['ondas P','P waves'],['QRS estreito','narrow QRS'],['QRS largo','wide QRS'],['QRS largos','wide QRS complexes'],['complexos QRS','QRS complexes'],['intervalo PR','PR interval'],['intervalos R–R','R–R intervals'],['intervalos R-R','R-R intervals'],
    ['condução AV','AV conduction'],['dissociação AV','AV dissociation'],['resposta ventricular','ventricular response'],['atividade atrial','atrial activity'],['atividade ventricular','ventricular activity'],['frequência cardíaca','heart rate'],
    ['sem pulso','pulseless'],['dor torácica','chest pain'],['dispneia','dyspnea'],['palpitações','palpitations'],['palpitação','palpitations'],['síncope','syncope'],['tontura','dizziness'],['hipotensão','hypotension'],['hipertensão','hypertension'],
    ['insuficiência cardíaca','heart failure'],['cardiomiopatia','cardiomyopathy'],['hipocalemia','hypokalemia'],['hipomagnesemia','hypomagnesemia'],['hipercalemia','hyperkalemia'],['hipotireoidismo','hypothyroidism'],['hipertireoidismo','hyperthyroidism'],['tireotoxicose','thyrotoxicosis'],
    ['pós-operatório','postoperative'],['pré-operatório','preoperative'],['pós-exercício','after exercise'],['após exercício','after exercise'],['pós-IAM','post-MI'],['IAM inferior','inferior MI'],['IAM anterior','anterior MI'],['isquemia aguda','acute ischemia'],
    ['idoso','older adult'],['Idoso','Older adult'],['jovem','young adult'],['Jovem','Young adult'],['paciente','patient'],['Paciente','Patient'],['gestante','pregnant patient'],['Gestante','Pregnant patient'],['atleta','athlete'],['Atleta','Athlete'],
    ['assintomático','asymptomatic'],['assintomática','asymptomatic'],['estável','stable'],['recorrente','recurrent'],['abrupto','abrupt'],['abrupta','abrupt'],['grave','severe'],['leve','mild'],
    ['avaliação','evaluation'],['consulta','visit'],['história','history'],['antecedentes','medical history'],['medicações','medications'],['medicação','medication'],['exame físico','physical examination'],['exames','tests'],['imagem','imaging'],['laboratório','laboratory'],
    ['sem alterações','unremarkable'],['sem achados agudos','no acute findings'],['sem sintomas','without symptoms'],['nega','denies'],['normal','normal'],['normais','normal'],['controlada','controlled'],['controlado','controlled'],
    ['antes de','before'],['após','after'],['durante','during'],['com','with'],['sem','without'],['e','and'],['ou','or'],['por','due to'],
    ['Qual é','What is'],['Qual','Which'],['sustentam sua interpretação','support your interpretation'],['Reconheça','Recognize'],['Procure','Look for'],['Observe','Observe'],['Avalie','Assess'],['Diferenciar','Differentiate'],['Evitar','Avoid'],['Associar','Associate'],
    ['Ritmo','Rhythm'],['Frequência','Rate'],['Bloqueio','Block'],['bloqueio','block'],['atrial','atrial'],['ventricular','ventricular'],['sinusal','sinus'],
    ['direito','right'],['esquerdo','left'],['primeiro grau','first degree'],['segundo grau','second degree'],['terceiro grau','third degree'],['completo','complete'],
    ['nível','level'],['caso','case'],['Caso','Case'],['variação','variation'],['treinamento','training'],['educacional','educational'],
  ];

  function translateText(value){
    if(window.ECG_LANG!=='en') return value;
    if(typeof value!=='string' || !value.trim()) return value;
    const trimmed=value.trim();
    if(exact[trimmed]){
      const lead=value.match(/^\s*/)?.[0]||''; const trail=value.match(/\s*$/)?.[0]||'';
      return lead+exact[trimmed]+trail;
    }
    // Do not translate URLs or IDs
    if(/^https?:\/\//i.test(value) || /^assets\//.test(value) || /^[A-Z0-9_-]+-\d+$/i.test(value)) return value;
    let out=value;
    for(const [pt,en] of phrasePairs){
      out=out.split(pt).join(en);
    }
    // common units/abbreviations remain unchanged; fix a few awkward collisions
    out=out.replace(/Patient young adult/g,'Young adult patient').replace(/Patient older adult/g,'Older adult patient');
    out=out.replace(/ and and /g,' and ').replace(/ with with /g,' with ');
    return out;
  }

  function translateDeep(obj){
    if(window.ECG_LANG!=='en') return obj;
    if(Array.isArray(obj)) return obj.map(translateDeep);
    if(obj && typeof obj==='object'){
      const out={};
      for(const [k,v] of Object.entries(obj)){
        // URLs / identifiers / image paths must remain intact
        if(['url','source_url','image_url','ecg_image','id','key','ecg_case_id','source_record_id','category'].includes(k)) out[k]=v;
        else out[k]=translateDeep(v);
      }
      return out;
    }
    return typeof obj==='string'?translateText(obj):obj;
  }

  function setLanguage(lang){
    if(!['pt-BR','en'].includes(lang)) return;
    localStorage.setItem(STORAGE_KEY,lang);
    location.reload();
  }
  function clearLanguage(){localStorage.removeItem(STORAGE_KEY);location.reload();}

  function translateNode(node){
    if(window.ECG_LANG!=='en' || !node) return;
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
    const nodes=[]; let n;
    while((n=walker.nextNode())) nodes.push(n);
    nodes.forEach(t=>{
      if(t.parentElement && ['SCRIPT','STYLE','CODE'].includes(t.parentElement.tagName)) return;
      const v=t.nodeValue; const nv=translateText(v); if(nv!==v)t.nodeValue=nv;
    });
    if(node.querySelectorAll){
      node.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el=>{
        ['placeholder','title','aria-label'].forEach(a=>{if(el.hasAttribute(a))el.setAttribute(a,translateText(el.getAttribute(a)))});
      });
    }
  }

  function addLanguageSwitcher(){
    const actions=document.querySelector('.topbar .actions');
    if(!actions || actions.querySelector('.language-switch-btn')) return;
    const b=document.createElement('button');
    b.className='btn btn-ghost language-switch-btn';
    b.textContent=window.ECG_LANG==='en'?'EN ▾':'PT ▾';
    b.title=window.ECG_LANG==='en'?'Change language':'Trocar idioma';
    b.onclick=clearLanguage;
    actions.prepend(b);
  }

  function initGate(){
    const gate=document.getElementById('languageGate');
    if(!gate) return;
    if(selected){gate.classList.add('hidden');document.documentElement.lang=selected==='en'?'en':'pt-BR';return;}
    gate.classList.remove('hidden');
    document.body.classList.add('language-pending');
    gate.querySelector('[data-lang="pt-BR"]')?.addEventListener('click',()=>setLanguage('pt-BR'));
    gate.querySelector('[data-lang="en"]')?.addEventListener('click',()=>setLanguage('en'));
  }

  document.addEventListener('DOMContentLoaded',()=>{
    initGate();
    if(window.ECG_LANG==='en') translateNode(document.body);
    const obs=new MutationObserver(muts=>{
      if(window.ECG_LANG==='en') muts.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1||n.nodeType===3)translateNode(n)}));
      addLanguageSwitcher();
    });
    obs.observe(document.body,{childList:true,subtree:true});
    addLanguageSwitcher();
  });

  window.ECG_I18N={translateText,translateDeep,setLanguage,clearLanguage,get language(){return window.ECG_LANG}};
})();
