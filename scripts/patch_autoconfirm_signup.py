from pathlib import Path

root = Path(__file__).resolve().parents[1]
p = root / 'app.js'
s = p.read_text(encoding='utf-8')

old = "document.getElementById('authForm').onsubmit=async e=>{e.preventDefault();if(!sb)return toast('Configure o Supabase em config.js ou use o modo demonstração.');const email=document.getElementById('authEmail').value.trim(),password=document.getElementById('authPassword').value;if(authMode==='signup'){const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:document.getElementById('authName').value.trim()}}});if(error)return toast(error.message);toast(data.session?'Conta criada e conectada.':'Conta criada. Confirme o e-mail para entrar.');if(!data.session)return}else{const {error}=await sb.auth.signInWithPassword({email,password});if(error)return toast(error.message)}closeAuth()};"

new = "document.getElementById('authForm').onsubmit=async e=>{e.preventDefault();if(!sb)return toast('Configure o Supabase em config.js ou use o modo demonstração.');const email=document.getElementById('authEmail').value.trim(),password=document.getElementById('authPassword').value,name=document.getElementById('authName').value.trim(),en=window.ECG_LANG==='en';if(authMode==='signup'){const btn=document.getElementById('authSubmit');if(btn)btn.disabled=true;try{const res=await fetch(`${CFG.SUPABASE_URL}/functions/v1/signup-autoconfirm`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,full_name:name,language:en?'en':'pt-BR'})}),data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||(en?'Could not create account.':'Não foi possível criar a conta.'));const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;toast(en?'Account created and signed in.':'Conta criada e conectada.')}catch(err){toast(err?.message||(en?'Could not create account.':'Não foi possível criar a conta.'));return}finally{if(btn)btn.disabled=false}}else{const {error}=await sb.auth.signInWithPassword({email,password});if(error)return toast(error.message)}closeAuth()};"

if old in s:
    s = s.replace(old, new, 1)
elif 'functions/v1/signup-autoconfirm' not in s:
    raise SystemExit('Could not locate the signup handler for autoconfirm patch')

if 'Confirme o e-mail para entrar.' in s:
    raise SystemExit('Legacy email-confirmation signup message is still present')

p.write_text(s, encoding='utf-8')
print('Email signup autoconfirm flow enabled')
