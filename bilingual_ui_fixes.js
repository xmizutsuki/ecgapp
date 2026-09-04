/* ECG Lab — bilingual UI consistency layer.
   Keeps dynamic interface strings coherent in Portuguese and English without
   using destructive word-by-word translation. */
(function(){
  const en=()=>window.ECG_LANG==='en';

  const EN=new Map([
    ['Treinar ECG','ECG Training'],['Treinar','Train'],['Treino rápido','Quick Training'],['Trilha de estudo','Study Path'],['Trilha de estudos','Study Path'],
    ['Simulados','Practice Exams'],['Simulado','Practice Exam'],['SIMULADO','PRACTICE EXAM'],['Tutor IA','AI Tutor'],['Início','Home'],['Sair','Sign out'],['Entrar','Sign in'],
    ['Seu progresso e próximos passos.','Your progress and next steps.'],['Interpretação guiada com feedback imediato.','Guided interpretation with immediate feedback.'],
    ['Do básico ao avançado em módulos progressivos.','From basic to advanced through progressive modules.'],['Avalie seu domínio com questões cronometradas.','Assess your knowledge with practice questions.'],
    ['Biblioteca educacional indisponível','Educational library unavailable'],['Nenhuma questão foi carregada.','No questions were loaded.'],
    ['Simulado personalizado','Custom practice exam'],['Escolha a quantidade de questões','Choose the number of questions'],['Quantidade de questões','Number of questions'],
    ['Começar simulado','Start practice exam'],['São necessárias pelo menos 20 questões.','At least 20 questions are required.'],['Simulado indisponível','Practice exam unavailable'],
    ['É necessário carregar pelo menos 20 questões para iniciar um simulado.','At least 20 questions must be loaded before starting a practice exam.'],
    ['As questões são embaralhadas a cada tentativa. O resultado aparece ao final.','Questions are shuffled on every attempt. Your score is shown at the end.'],
    ['Resultado','Result'],['Você acertou','You answered'],['questões.','questions correctly.'],['Refazer','Try again'],['✓ Correto','✓ Correct'],['Resposta incorreta','Incorrect answer'],
    ['treino adaptativo','adaptive training'],['questão atual','current question'],['precisão','accuracy'],['sequência','streak'],['Reiniciar treino','Restart training'],
    ['ECG adaptativo','Adaptive ECG'],['Ajustar','Fit'],['Tela cheia','Fullscreen'],['Dica','Hint'],['Confirmar','Confirm'],['Próxima questão adaptativa','Next adaptive question'],
    ['Dica de interpretação','Interpretation hint'],['Treino adaptativo reiniciado no nível fácil.','Adaptive training restarted at the easiest level.'],
    ['Esta questão já foi respondida.','This question has already been answered.'],['Selecione uma alternativa.','Select an answer.'],
    ['Correto — dificuldade adaptada.','Correct — difficulty adjusted.'],['Resposta registrada — o próximo item será ajustado.','Answer recorded — the next item will be adjusted.'],
    ['Traçado educacional vetorial','Educational vector tracing'],['SVG em alta definição','High-definition SVG'],['O diagnóstico só é revelado após responder','The diagnosis is revealed only after you answer'],
    ['Carregando biblioteca de ECG...','Loading ECG library...'],['114 traçados vetoriais em alta definição','114 high-definition vector tracings'],
    ['Fundamental','Foundation'],['Básico','Basic'],['Intermediário','Intermediate'],['Avançado','Advanced'],['Especialista','Expert']
  ]);

  const PT=new Map([
    ['ECG Training','Treinar ECG'],['Train','Treinar'],['Quick Training','Treino rápido'],['Study Path','Trilha de estudos'],['Practice Exams','Simulados'],['Practice Exam','Simulado'],
    ['AI Tutor','Tutor IA'],['Home','Início'],['Sign out','Sair'],['Sign in','Entrar'],['Custom practice exam','Simulado personalizado'],
    ['Choose the number of questions','Escolha a quantidade de questões'],['Number of questions','Quantidade de questões'],['Start practice exam','Começar simulado'],
    ['Practice exam unavailable','Simulado indisponível'],['Result','Resultado'],['Try again','Refazer'],['✓ Correct','✓ Correto'],['Incorrect answer','Resposta incorreta'],
    ['adaptive training','treino adaptativo'],['current question','questão atual'],['accuracy','precisão'],['streak','sequência'],['Restart training','Reiniciar treino'],
    ['Adaptive ECG','ECG adaptativo'],['Fit','Ajustar'],['Fullscreen','Tela cheia'],['Hint','Dica'],['Confirm','Confirmar'],['Next adaptive question','Próxima questão adaptativa'],
    ['Foundation','Fundamental'],['Basic','Básico'],['Intermediate','Intermediário'],['Advanced','Avançado'],['Expert','Especialista']
  ]);

  function dynamicText(s){
    if(en()){
      let m;
      if((m=s.match(/^Nível estimado (\d+) de (\d+)$/i)))return `Estimated level ${m[1]} of ${m[2]}`;
      if((m=s.match(/^(\d+) questão atual$/i)))return `${m[1]} current question`;
      if((m=s.match(/^(\d+)% precisão$/i)))return `${m[1]}% accuracy`;
      if((m=s.match(/^(\d+) sequência$/i)))return `${m[1]} streak`;
      if((m=s.match(/^ECG adaptativo #(\d+)$/i)))return `Adaptive ECG #${m[1]}`;
      if((m=s.match(/^CAT • dificuldade (\d+)\/(\d+)$/i)))return `CAT • difficulty ${m[1]}/${m[2]}`;
      if((m=s.match(/^Nível (\d+)$/i)))return `Level ${m[1]}`;
      if((m=s.match(/^(\d+) aulas$/i)))return `${m[1]} lessons`;
      if((m=s.match(/^(\d+) casos$/i)))return `${m[1]} cases`;
      if((m=s.match(/^Caso (\d+)$/i)))return `Case ${m[1]}`;
      if((m=s.match(/^Você acertou (\d+) de (\d+) questões\.?$/i)))return `You answered ${m[1]} of ${m[2]} questions correctly.`;
      return s;
    }
    let m;
    if((m=s.match(/^Estimated level (\d+) of (\d+)$/i)))return `Nível estimado ${m[1]} de ${m[2]}`;
    if((m=s.match(/^(\d+) current question$/i)))return `${m[1]} questão atual`;
    if((m=s.match(/^(\d+)% accuracy$/i)))return `${m[1]}% precisão`;
    if((m=s.match(/^(\d+) streak$/i)))return `${m[1]} sequência`;
    if((m=s.match(/^Adaptive ECG #(\d+)$/i)))return `ECG adaptativo #${m[1]}`;
    if((m=s.match(/^CAT • difficulty (\d+)\/(\d+)$/i)))return `CAT • dificuldade ${m[1]}/${m[2]}`;
    if((m=s.match(/^Level (\d+)$/i)))return `Nível ${m[1]}`;
    if((m=s.match(/^(\d+) lessons$/i)))return `${m[1]} aulas`;
    if((m=s.match(/^(\d+) cases$/i)))return `${m[1]} casos`;
    if((m=s.match(/^Case (\d+)$/i)))return `Caso ${m[1]}`;
    return s;
  }

  function translateExactText(root=document.body){
    if(!root) return;
    const map=en()?EN:PT;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let n;
    while((n=walker.nextNode()))nodes.push(n);
    for(const node of nodes){
      if(node.parentElement && ['SCRIPT','STYLE','CODE'].includes(node.parentElement.tagName))continue;
      const raw=node.nodeValue||'';const trimmed=raw.trim();
      if(!trimmed)continue;
      const replacement=map.get(trimmed) ?? dynamicText(trimmed);
      if(replacement!==trimmed)node.nodeValue=raw.replace(trimmed,replacement);
    }
  }

  if(typeof showPage==='function'){
    window.__ecgOriginalShowPage=showPage;
    showPage=function(id){
      window.__ecgOriginalShowPage(id);
      const meta=en()?{
        dashboard:['Dashboard','Your progress and next steps.'],
        treinar:['ECG Training','Guided interpretation with immediate feedback.'],
        trilha:['Study Path','From fundamentals to advanced ECG interpretation.'],
        simulados:['Practice Exams','Assess your knowledge with randomized ECG questions.'],
        tutor:['AI Tutor','Review ECG concepts and clinical reasoning.'],
        admin:['Admin Panel','Manage ECGs and educational content.']
      }:{
        dashboard:['Dashboard','Seu progresso e próximos passos.'],
        treinar:['Treinar ECG','Interpretação guiada com feedback imediato.'],
        trilha:['Trilha de estudos','Do básico ao avançado em módulos progressivos.'],
        simulados:['Simulados','Avalie seu domínio com questões aleatórias de ECG.'],
        tutor:['Tutor IA','Revise conceitos e raciocínio eletrocardiográfico.'],
        admin:['Painel administrativo','Gerencie ECGs e conteúdo educacional.']
      };
      const m=meta[id]||meta.dashboard;
      const title=document.getElementById('pageTitle'),sub=document.getElementById('pageSubtitle');
      if(title)title.textContent=m[0];if(sub)sub.textContent=m[1];
      translateExactText(document.getElementById(id)||document.body);
    };
  }

  if(typeof adaptiveLevelLabel==='function'){
    adaptiveLevelLabel=function(){
      const d=clamp(Math.round(state.adaptive.ability),1,adaptiveMaxDifficulty());
      const pt=['','Fundamental','Básico','Intermediário','Avançado','Especialista'];
      const eng=['','Foundation','Basic','Intermediate','Advanced','Expert'];
      return (en()?eng:pt)[d]||String(d);
    };
  }

  document.addEventListener('DOMContentLoaded',()=>{
    translateExactText(document.body);
    const obs=new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(node=>{
      if(node.nodeType===1)translateExactText(node);
      else if(node.nodeType===3&&node.parentElement)translateExactText(node.parentElement);
    })));
    obs.observe(document.body,{childList:true,subtree:true});
  });

  window.addEventListener('load',async()=>{
    try{
      if(typeof state!=='undefined' && (!state.questions?.length || !state.ecgCases?.length) && typeof loadRealLibrary==='function'){
        state.libraryError=null;
        await loadRealLibrary();
        state.ecgCases=[...(state.realCases||[])];
        state.questions=[...(state.realQuestions||[])];
        if(typeof renderTraining==='function')renderTraining();
        if(typeof renderSims==='function')renderSims();
      }
      translateExactText(document.body);
    }catch(err){console.error('ECG Lab bilingual recovery:',err)}
  });

  window.ECG_UI_LANGUAGE={translateExactText};
})();
