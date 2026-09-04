/* ECG Lab — beta runtime support.
   Adds version/feedback UX, friendly authentication errors and password recovery,
   plus privacy-conscious client error breadcrumbs. No secret or token is logged. */
(function(){
  'use strict';

  const CFG=window.ECG_CONFIG||{};
  const VERSION=CFG.APP_VERSION||'0.9.0-beta.1';
  const ERROR_KEY='ecgLabBetaErrors:v1';
  const FEEDBACK_KEY='ecgLabBetaFeedbackQueue:v1';
  const MAX_ERRORS=20;
  const MAX_FEEDBACK=20;
  const en=()=>window.ECG_LANG==='en';
  const T=()=>en()?{
    report:'Beta · Report issue',version:`Version ${VERSION}`,title:'Report a beta issue',category:'Category',description:'What happened?',placeholder:'Describe what you were doing, what you expected, and what happened.',send:'Send report',cancel:'Cancel',sent:'Thanks — your report was sent.',saved:'Report saved on this device and will be retried when you are online.',required:'Please describe the issue before sending.',
    catBug:'Bug',catVisual:'Visual / layout',catPerf:'Performance',catContent:'Content / translation',catOther:'Other',
    forgot:'Forgot password?',resetTitle:'Reset password',resetHelp:'Enter your account email and we will send a recovery link.',resetSend:'Send recovery email',resetSent:'If an account exists for this email, a recovery link has been sent.',newPassword:'Set a new password',newPasswordHelp:'Choose a password with at least 6 characters.',password:'New password',confirm:'Confirm password',savePassword:'Save new password',passwordSaved:'Password updated. You can continue using ECG Lab.',passwordMismatch:'The passwords do not match.',passwordShort:'Use at least 6 characters.',emailNeeded:'Enter a valid email address.',authWait:'Please wait…',authUnavailable:'Sign-in is temporarily unavailable. Try again in a moment.',badLogin:'Incorrect email or password.',emailConfirm:'Confirm your email before signing in.',alreadyRegistered:'An account already exists for this email.',network:'Could not connect. Check your internet connection and try again.',generic:'Something went wrong. Please try again.'
  }:{
    report:'Beta · Reportar problema',version:`Versão ${VERSION}`,title:'Reportar problema do beta',category:'Categoria',description:'O que aconteceu?',placeholder:'Descreva o que estava fazendo, o que esperava e o que aconteceu.',send:'Enviar relato',cancel:'Cancelar',sent:'Obrigado — seu relato foi enviado.',saved:'Relato salvo neste dispositivo e será reenviado quando houver conexão.',required:'Descreva o problema antes de enviar.',
    catBug:'Bug',catVisual:'Visual / layout',catPerf:'Desempenho',catContent:'Conteúdo / tradução',catOther:'Outro',
    forgot:'Esqueci minha senha',resetTitle:'Redefinir senha',resetHelp:'Informe o e-mail da sua conta e enviaremos um link de recuperação.',resetSend:'Enviar e-mail de recuperação',resetSent:'Se existir uma conta para este e-mail, um link de recuperação foi enviado.',newPassword:'Definir nova senha',newPasswordHelp:'Escolha uma senha com pelo menos 6 caracteres.',password:'Nova senha',confirm:'Confirmar senha',savePassword:'Salvar nova senha',passwordSaved:'Senha atualizada. Você pode continuar usando o ECG Lab.',passwordMismatch:'As senhas não coincidem.',passwordShort:'Use pelo menos 6 caracteres.',emailNeeded:'Informe um e-mail válido.',authWait:'Aguarde…',authUnavailable:'O login está temporariamente indisponível. Tente novamente em instantes.',badLogin:'E-mail ou senha incorretos.',emailConfirm:'Confirme seu e-mail antes de entrar.',alreadyRegistered:'Já existe uma conta com este e-mail.',network:'Não foi possível conectar. Verifique sua internet e tente novamente.',generic:'Não foi possível concluir a operação. Tente novamente.'
  };

  const toastSafe=msg=>{try{if(typeof window.toast==='function')window.toast(msg)}catch{}}
  const getPage=()=>window.ECG_NAVIGATION?.currentPage?.()||(typeof state!=='undefined'&&state?.page)||document.querySelector('.page.active')?.id||'unknown';
  const userId=()=>typeof state!=='undefined'&&state?.user?.id&&!state?.demo?state.user.id:null;
  const hasCloud=()=>typeof sb!=='undefined'&&!!sb&&!!userId();
  const safeText=v=>String(v??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,4000);

  function readJson(key,fallback=[]){try{const x=JSON.parse(localStorage.getItem(key)||'null');return x??fallback}catch{return fallback}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
  function recordError(kind,err,extra={}){
    const message=safeText(err?.message||err?.reason?.message||String(err||kind)).slice(0,300);
    const item={at:new Date().toISOString(),kind,page:getPage(),version:VERSION,message,source:safeText(extra.source||'').split('/').pop().slice(0,100),line:Number(extra.line)||null};
    const list=readJson(ERROR_KEY,[]);list.push(item);writeJson(ERROR_KEY,list.slice(-MAX_ERRORS));
  }
  window.addEventListener('error',e=>recordError('error',e.error||e.message,{source:e.filename,line:e.lineno}));
  window.addEventListener('unhandledrejection',e=>recordError('unhandledrejection',e.reason));

  function technicalMeta(){
    return {page:getPage(),app_version:VERSION,language:window.ECG_LANG||'pt-BR',user_agent:navigator.userAgent.slice(0,500),platform:String(navigator.userAgentData?.platform||navigator.platform||'').slice(0,100),viewport:{width:window.innerWidth,height:window.innerHeight,dpr:window.devicePixelRatio||1},recent_error_count:readJson(ERROR_KEY,[]).length};
  }

  function ensureLauncher(){
    let b=document.getElementById('betaFeedbackLauncher');
    if(!b){b=document.createElement('button');b.id='betaFeedbackLauncher';b.type='button';b.className='beta-feedback-launcher';b.addEventListener('click',openFeedback);document.body.appendChild(b)}
    b.textContent=T().report;b.setAttribute('aria-label',T().report);b.title=T().report;
  }
  function decorateShell(){
    const footer=document.querySelector('.sidebar-footer');
    if(footer&&!footer.querySelector('.beta-version')){
      const v=document.createElement('small');v.className='beta-version';v.textContent=T().version;footer.appendChild(v);
    }
    ensureLauncher();
  }

  function modalBase(id,title,body){
    document.getElementById(id)?.remove();
    const wrap=document.createElement('div');wrap.id=id;wrap.className='beta-modal-backdrop';wrap.innerHTML=`<div class="beta-modal" role="dialog" aria-modal="true" aria-labelledby="${id}Title"><button type="button" class="beta-modal-close" aria-label="${en()?'Close':'Fechar'}">×</button><h2 id="${id}Title"></h2><div class="beta-modal-body"></div></div>`;
    wrap.querySelector('h2').textContent=title;wrap.querySelector('.beta-modal-body').appendChild(body);wrap.querySelector('.beta-modal-close').onclick=()=>wrap.remove();wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});document.body.appendChild(wrap);return wrap;
  }

  function openFeedback(){
    const t=T(),form=document.createElement('form');form.className='beta-feedback-form';
    form.innerHTML=`<label><span>${t.category}</span><select id="betaFeedbackCategory"><option value="bug">${t.catBug}</option><option value="visual">${t.catVisual}</option><option value="performance">${t.catPerf}</option><option value="content">${t.catContent}</option><option value="other">${t.catOther}</option></select></label><label><span>${t.description}</span><textarea id="betaFeedbackDescription" rows="6" maxlength="4000" required></textarea></label><div class="beta-tech-meta" id="betaTechMeta"></div><div class="beta-modal-actions"><button type="button" class="btn btn-ghost" data-beta-cancel>${t.cancel}</button><button type="submit" class="btn btn-primary">${t.send}</button></div>`;
    form.querySelector('textarea').placeholder=t.placeholder;
    const m=technicalMeta();form.querySelector('#betaTechMeta').textContent=`${m.page} • ${m.app_version} • ${m.viewport.width}×${m.viewport.height}`;
    const modal=modalBase('betaFeedbackModal',t.title,form);form.querySelector('[data-beta-cancel]').onclick=()=>modal.remove();form.onsubmit=async e=>{e.preventDefault();const description=safeText(form.querySelector('#betaFeedbackDescription').value);if(!description){toastSafe(t.required);return}const btn=form.querySelector('[type="submit"]');btn.disabled=true;const payload={category:form.querySelector('#betaFeedbackCategory').value,description,...technicalMeta()};const ok=await sendFeedback(payload);btn.disabled=false;if(ok){modal.remove();toastSafe(t.sent)}else{queueFeedback(payload);modal.remove();toastSafe(t.saved)}};
    setTimeout(()=>form.querySelector('textarea')?.focus(),0);
  }

  async function sendFeedback(payload){
    if(!hasCloud()||navigator.onLine===false)return false;
    try{const {error}=await sb.from('beta_feedback').insert({user_id:userId(),category:payload.category,description:payload.description,page:payload.page,app_version:payload.app_version,language:payload.language,user_agent:payload.user_agent,platform:payload.platform,viewport:payload.viewport});if(error)throw error;return true}catch(e){recordError('feedback_sync',e);return false}
  }
  function queueFeedback(payload){const list=readJson(FEEDBACK_KEY,[]);list.push({...payload,queued_at:new Date().toISOString()});writeJson(FEEDBACK_KEY,list.slice(-MAX_FEEDBACK))}
  async function syncFeedbackQueue(){
    if(!hasCloud()||navigator.onLine===false)return;const list=readJson(FEEDBACK_KEY,[]);if(!list.length)return;const remaining=[];
    for(const item of list){if(!(await sendFeedback(item)))remaining.push(item)}writeJson(FEEDBACK_KEY,remaining);
  }
  window.addEventListener('online',()=>void syncFeedbackQueue());

  function friendlyAuthError(error){
    const t=T(),s=String(error?.message||error||'').toLowerCase();
    if(/invalid login credentials|invalid.*password/.test(s))return t.badLogin;
    if(/email not confirmed|confirm.*email/.test(s))return t.emailConfirm;
    if(/already registered|already been registered|user already/.test(s))return t.alreadyRegistered;
    if(/fetch|network|connection|failed to fetch/.test(s))return t.network;
    return t.generic;
  }

  function ensureForgotButton(){
    const form=document.getElementById('authForm');if(!form||document.getElementById('forgotPasswordBtn'))return;
    const b=document.createElement('button');b.type='button';b.id='forgotPasswordBtn';b.className='auth-forgot';b.textContent=T().forgot;b.onclick=openResetRequest;form.insertAdjacentElement('afterend',b);updateForgotVisibility();
    document.querySelectorAll('[data-auth-tab]').forEach(tab=>tab.addEventListener('click',()=>setTimeout(updateForgotVisibility,0)));
  }
  function updateForgotVisibility(){const b=document.getElementById('forgotPasswordBtn');if(b)b.hidden=(typeof authMode!=='undefined'&&authMode!=='login')}
  function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}

  function openResetRequest(){
    const t=T(),form=document.createElement('form');form.className='beta-feedback-form';const current=document.getElementById('authEmail')?.value?.trim()||'';
    form.innerHTML=`<p>${t.resetHelp}</p><label><span>E-mail</span><input id="betaResetEmail" type="email" autocomplete="email" required></label><div class="beta-modal-actions"><button type="button" class="btn btn-ghost" data-reset-cancel>${t.cancel}</button><button type="submit" class="btn btn-primary">${t.resetSend}</button></div>`;form.querySelector('#betaResetEmail').value=current;
    const modal=modalBase('betaResetModal',t.resetTitle,form);form.querySelector('[data-reset-cancel]').onclick=()=>modal.remove();form.onsubmit=async e=>{e.preventDefault();const email=form.querySelector('#betaResetEmail').value.trim();if(!validEmail(email)){toastSafe(t.emailNeeded);return}if(typeof sb==='undefined'||!sb){toastSafe(t.authUnavailable);return}const btn=form.querySelector('[type="submit"]');btn.disabled=true;try{const redirectTo=location.origin+location.pathname;const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error;modal.remove();toastSafe(t.resetSent)}catch(err){toastSafe(friendlyAuthError(err));recordError('password_reset_request',err)}finally{btn.disabled=false}};
  }

  function openNewPassword(){
    if(document.getElementById('betaNewPasswordModal'))return;const t=T(),form=document.createElement('form');form.className='beta-feedback-form';
    form.innerHTML=`<p>${t.newPasswordHelp}</p><label><span>${t.password}</span><input id="betaNewPassword" type="password" minlength="6" autocomplete="new-password" required></label><label><span>${t.confirm}</span><input id="betaConfirmPassword" type="password" minlength="6" autocomplete="new-password" required></label><div class="beta-modal-actions"><button type="submit" class="btn btn-primary">${t.savePassword}</button></div>`;
    const modal=modalBase('betaNewPasswordModal',t.newPassword,form);form.onsubmit=async e=>{e.preventDefault();const p=form.querySelector('#betaNewPassword').value,c=form.querySelector('#betaConfirmPassword').value;if(p.length<6){toastSafe(t.passwordShort);return}if(p!==c){toastSafe(t.passwordMismatch);return}const btn=form.querySelector('[type="submit"]');btn.disabled=true;try{const {error}=await sb.auth.updateUser({password:p});if(error)throw error;modal.remove();toastSafe(t.passwordSaved)}catch(err){toastSafe(friendlyAuthError(err));recordError('password_update',err)}finally{btn.disabled=false}};
  }

  function installAuthGuard(){
    ensureForgotButton();const form=document.getElementById('authForm');if(!form||form.dataset.betaGuard==='1')return;form.dataset.betaGuard='1';
    form.addEventListener('submit',async e=>{
      e.preventDefault();e.stopImmediatePropagation();const t=T();
      if(typeof sb==='undefined'||!sb){toastSafe(t.authUnavailable);return}
      const email=document.getElementById('authEmail').value.trim(),password=document.getElementById('authPassword').value,mode=typeof authMode!=='undefined'?authMode:'login';if(!validEmail(email)){toastSafe(t.emailNeeded);return}if(password.length<6){toastSafe(t.passwordShort);return}
      const button=document.getElementById('authSubmit'),old=button.textContent;button.disabled=true;button.textContent=t.authWait;
      try{
        if(mode==='signup'){
          const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:document.getElementById('authName').value.trim()}}});if(error)throw error;toastSafe(data.session?(en()?'Account created and signed in.':'Conta criada e conectada.'):(en()?'Account created. Confirm your email to sign in.':'Conta criada. Confirme o e-mail para entrar.'));if(!data.session)return;
        }else{const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error}
        if(typeof closeAuth==='function')closeAuth();
      }catch(err){toastSafe(friendlyAuthError(err));recordError('auth',err)}finally{button.disabled=false;button.textContent=old}
    },true);
  }

  function subscribeRecovery(){
    let attempts=0;const timer=setInterval(()=>{attempts++;if(typeof sb!=='undefined'&&sb?.auth){clearInterval(timer);sb.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')setTimeout(openNewPassword,0)});void syncFeedbackQueue()}else if(attempts>100)clearInterval(timer)},100);
  }

  const originalShell=typeof window.shell==='function'?window.shell:null;
  if(originalShell){window.shell=function(...args){const out=originalShell.apply(this,args);decorateShell();ensureForgotButton();installAuthGuard();return out}}
  window.addEventListener('ecg:pagechange',()=>{decorateShell();ensureForgotButton()});
  window.addEventListener('load',()=>{decorateShell();installAuthGuard()},{once:true});
  document.addEventListener('DOMContentLoaded',()=>{ensureLauncher();installAuthGuard()},{once:true});
  subscribeRecovery();

  window.ECG_BETA={version:VERSION,openFeedback,technicalMeta,syncFeedbackQueue};
})();
