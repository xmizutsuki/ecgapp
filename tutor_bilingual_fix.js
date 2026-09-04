/* ECG Lab — deterministic bilingual AI Tutor */
(function(){
  const isEn=()=>window.ECG_LANG==='en';

  function renderTutorBilingual(){
    const el=document.getElementById('tutor');
    if(!el)return;
    if(isEn()){
      el.innerHTML=`<div class="tutor-layout"><article class="card tutor-info"><span class="eyebrow">Educational tutor</span><h2>CardioTutor AI</h2><p class="muted">Use the tutor to understand ECG concepts, compare patterns, and review your reasoning. It is an educational tool and should not be used to diagnose real-patient ECGs or replace professional clinical assessment.</p><div class="list"><div class="list-item"><div class="list-num">1</div><div><h4>Explain a concept</h4><p>“How do I differentiate atrial fibrillation from atrial flutter?”</p></div></div><div class="list-item"><div class="list-num">2</div><div><h4>Review a mistake</h4><p>“Why does progressive PR prolongation suggest Mobitz I?”</p></div></div></div></article><article class="card chat"><div class="chat-log" id="chatLog"><div class="msg bot">Hi! I can explain ECG interpretation step by step. Ask about rhythm, intervals, AV blocks, arrhythmias, or a systematic ECG approach.</div></div><div class="chat-compose"><textarea id="tutorInput" placeholder="Type your question..."></textarea><button class="btn btn-primary" id="tutorSend">Send</button></div></article></div>`;
    }else{
      el.innerHTML=`<div class="tutor-layout"><article class="card tutor-info"><span class="eyebrow">Tutor educacional</span><h2>CardioTutor IA</h2><p class="muted">Use o tutor para entender conceitos, comparar padrões e revisar o raciocínio. Ele é uma ferramenta educacional e não deve ser usado para diagnosticar ECGs de pacientes reais nem substituir avaliação profissional.</p><div class="list"><div class="list-item"><div class="list-num">1</div><div><h4>Explique um conceito</h4><p>“Como diferenciar fibrilação atrial de flutter atrial?”</p></div></div><div class="list-item"><div class="list-num">2</div><div><h4>Revise um erro</h4><p>“Por que o prolongamento progressivo do PR sugere Mobitz I?”</p></div></div></div></article><article class="card chat"><div class="chat-log" id="chatLog"><div class="msg bot">Olá! Posso explicar a interpretação do ECG passo a passo. Pergunte sobre ritmo, intervalos, bloqueios AV, arritmias ou interpretação sistemática.</div></div><div class="chat-compose"><textarea id="tutorInput" placeholder="Digite sua dúvida..."></textarea><button class="btn btn-primary" id="tutorSend">Enviar</button></div></article></div>`;
    }
    document.getElementById('tutorSend')?.addEventListener('click',sendTutorBilingual);
  }

  async function sendTutorBilingual(){
    const inp=document.getElementById('tutorInput');
    const text=inp?.value.trim();
    if(!text)return;
    appendMsg(text,'user');
    inp.value='';

    if(!sb||!state.user||state.demo){
      const msg=isEn()
        ? 'Demo mode: connect Supabase and configure the `ecg-tutor` Edge Function to enable AI responses. In the meantime, use a systematic approach: rate, regularity, P wave, PR interval, QRS width, and ST-T changes.'
        : 'Modo demonstração: conecte o Supabase e configure a Edge Function `ecg-tutor` para ativar respostas por IA. Enquanto isso, use uma abordagem sistemática: frequência, regularidade, onda P, intervalo PR, largura do QRS e alterações de ST-T.';
      setTimeout(()=>appendMsg(msg,'bot'),300);
      return;
    }

    try{
      const {data:{session}}=await sb.auth.getSession();
      const res=await fetch(`${CFG.SUPABASE_URL}/functions/v1/ecg-tutor`,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},
        body:JSON.stringify({message:text,language:window.ECG_LANG||'pt-BR'})
      });
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||(isEn()?'Tutor request failed':'Falha no tutor'));
      appendMsg(data.reply||(isEn()?'No response was returned.':'Sem resposta.'),'bot');
    }catch(e){
      appendMsg((isEn()?'I could not access the tutor: ':'Não consegui acessar o tutor: ')+e.message,'bot');
    }
  }

  window.renderTutor=renderTutorBilingual;
  window.sendTutor=sendTutorBilingual;
  try{renderTutorBilingual()}catch(e){console.warn('Tutor bilingual render deferred',e)}
})();
