/* ECG Lab: custom simulations 20–80. */
function renderSims(){
  const en=window.ECG_LANG==='en';
  const el=document.getElementById('simulados');
  const available=Math.min(80,state.questions?.length||80);
  el.innerHTML=`<article class="card sim-builder">
    <div class="sim-builder-copy"><span class="eyebrow">${en?'Custom practice exam':'Simulado personalizado'}</span><h2>${en?'Choose the number of questions':'Escolha a quantidade de questões'}</h2><p>${en?'Build a practice exam with randomized questions from the entire library. Choose between 20 and 80 questions.':'Monte um simulado com questões aleatórias de toda a biblioteca. Escolha entre 20 e 80 questões.'}</p></div>
    <div class="sim-count-panel">
      <div class="sim-count-head"><label for="simCountRange">${en?'Number of questions':'Quantidade de questões'}</label><strong id="simCountValue">40</strong></div>
      <input id="simCountRange" class="sim-range" type="range" min="20" max="${available}" step="1" value="${Math.min(40,available)}" aria-label="${en?'Number of questions in the practice exam':'Quantidade de questões do simulado'}">
      <div class="sim-range-labels"><span>20</span><span>${available}</span></div>
      <div class="sim-quick-counts">${[20,40,60,80].filter(n=>n<=available).map(n=>`<button class="chip${n===40?' active':''}" type="button" data-sim-count="${n}">${n}</button>`).join('')}</div>
      <button class="btn btn-primary full sim-start-btn" id="startCustomSim">${en?'Start practice exam':'Começar simulado'}</button>
      <p class="muted sim-count-note">${en?'Questions are shuffled on every attempt. Your score is shown at the end.':'As questões são embaralhadas a cada tentativa. O resultado aparece ao final.'}</p>
    </div>
  </article><div id="simRunner" style="margin-top:16px"></div>`;
  const range=document.getElementById('simCountRange'),value=document.getElementById('simCountValue');
  const sync=()=>{const n=Number(range.value);value.textContent=n;document.querySelectorAll('[data-sim-count]').forEach(b=>b.classList.toggle('active',Number(b.dataset.simCount)===n))};
  range.oninput=sync;
  document.querySelectorAll('[data-sim-count]').forEach(b=>b.onclick=()=>{range.value=b.dataset.simCount;sync()});
  document.getElementById('startCustomSim').onclick=()=>startSim(Number(range.value));
  sync();
}

async function startSim(n){
  n=Math.max(20,Math.min(80,Math.round(Number(n)||20),state.questions.length));
  state.sim=[...state.questions].sort(()=>Math.random()-.5).slice(0,n);state.simIndex=0;state.simScore=0;state.simAttemptId=null;state.simSaved=false;
  if(sb&&state.user&&!state.demo){const {data}=await sb.from('simulation_attempts').insert({user_id:state.user.id,title:'Simulado ECG Lab',total_questions:state.sim.length,correct_answers:0}).select('id').single();state.simAttemptId=data?.id||null}
  renderSimQuestion();
}

function renderSimQuestion(){const en=window.ECG_LANG==='en';const box=document.getElementById('simRunner');if(!state.sim||state.simIndex>=state.sim.length){saveSimResult();box.innerHTML=`<article class="card section"><h3>${en?'Result':'Resultado'}</h3><p class="muted">${en?'You answered':'Você acertou'} <strong>${state.simScore}</strong> ${en?'of':'de'} <strong>${state.sim?.length||0}</strong> ${en?'questions correctly.':'questões.'}</p><button class="btn btn-primary" onclick="startSim(${state.sim?.length||20})">${en?'Try again':'Refazer'}</button></article>`;return}const q=state.sim[state.simIndex];box.innerHTML=`<article class="card question"><span class="eyebrow">${state.simIndex+1}/${state.sim.length}</span><h2>${esc(q.prompt)}</h2><div class="answers">${q.options.map((o,i)=>`<button class="answer" data-simopt="${i}">${esc(Array.isArray(o)?o[0]:o.label)}</button>`).join('')}</div><div class="feedback" id="simFeedback"><strong></strong><p style="margin-bottom:0"></p></div></article>`;document.querySelectorAll('[data-simopt]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.simopt),o=q.options[i],ok=Array.isArray(o)?o[1]:o.is_correct;if(ok)state.simScore++;document.querySelectorAll('[data-simopt]').forEach((x,ix)=>{const oo=q.options[ix],yes=Array.isArray(oo)?oo[1]:oo.is_correct;if(yes)x.classList.add('correct');if(ix===i&&!ok)x.classList.add('wrong');x.disabled=true});const f=document.getElementById('simFeedback');f.classList.add('show');f.querySelector('strong').textContent=ok?(en?'✓ Correct':'✓ Correto'):(en?'Incorrect answer':'Resposta incorreta');f.querySelector('p').textContent=q.explanation;setTimeout(()=>{state.simIndex++;renderSimQuestion()},1100)})}

try { if(document.getElementById('trilha')) renderTrail(); if(document.getElementById('simulados')) renderSims(); } catch(e){ console.warn('ECG Lab feature refresh failed',e); }
