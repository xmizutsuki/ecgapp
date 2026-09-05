# ECG Lab — Beta 1.1

Aplicação web educacional bilíngue (Português / English) para treinamento estruturado de interpretação eletrocardiográfica.

> **Versão:** `1.1.0-beta.1`  
> **Produção:** https://xmizutsuki.github.io/ecgapp/

## Escopo da Beta 1.1

A Beta 1.1 consolida a experiência do estudante, amplia a trilha de estudos e endurece os gates de pré-publicação. O conteúdo educacional curado permanece empacotado no frontend; o Supabase é usado para autenticação, sincronização de progresso, persistência das sessões, feedback do beta e funções de IA.

Principais recursos:

- **114 traçados educacionais vetoriais** em 19 categorias;
- treino adaptativo CAT de **20 a 80 questões**, com salvamento e retomada;
- simulados de **20 a 80 questões**, histórico, resultado e revisão;
- **21 aulas** e **210 estudos de caso fictícios** em Português e English;
- aula de **Isquemia e ST-T com 20 casos clínicos e ECG sintético de 12 derivações**;
- zoom interativo nos ECGs dos estudos de caso: botões, roda do mouse, arrastar, duplo clique, pinça e tela cheia;
- **42 PDFs** de 6 páginas: 21 em português + 21 em inglês;
- Meu Desempenho consolidando treino, simulados e atividades;
- CardioTutor flutuante com contexto da tela e proteção contra entrega da resposta antes da tentativa;
- CaseCoach com texto/ditado e feedback educacional por IA;
- análise de desempenho por IA usando apenas agregados calculados pelo aplicativo;
- modo demonstração/local;
- feedback do beta com metadados técnicos não sensíveis;
- layout responsivo para desktop, tablet e mobile.

## Aviso educacional

Os traçados e casos são reconstruções/simulações para ensino. Não representam ECGs ou pacientes reais e não substituem avaliação clínica, laudo profissional, protocolos institucionais ou julgamento clínico.

## Conteúdo e ECGs vetoriais

A biblioteca principal usa SVGs gerados por:

```text
scripts/generate_ecg_svgs.py
```

O build cria e valida 114 traçados em `assets/ecg/`, verificando XML, conteúdo ativo proibido e integridade da biblioteca. Fontes, limitações e critérios estão documentados em `DATA_SOURCES.md` e `ECG_LIBRARY_MANIFEST.md`.

Os 20 casos de Isquemia/ST-T usam ECGs sintéticos de 12 derivações gerados em runtime por `study_case_ischemia.js`, sem dependência de imagens externas.

## Trilha de estudos e PDFs

A trilha contém 21 aulas e 210 casos clínicos fictícios. Cada aula possui um PDF aprofundado em português e outro em inglês, gerados por:

```text
scripts/generate_lesson_pdfs.py
```

O build exige 21 PDFs por idioma e 6 páginas por arquivo. A referência fisiológica principal é **Guyton and Hall Textbook of Medical Physiology, 15th ed.**; referências específicas complementam cada tema. Nenhuma figura protegida do tratado é reproduzida.

## Português / English

Na primeira abertura, o usuário escolhe Português (Brasil) ou English. A preferência fica salva localmente. A interface e o conteúdo dinâmico usam `i18n.js`, `english_content.js`, `english_content_finalize.js`, `localize_data.js` e as camadas clínicas específicas, com auditoria bilíngue no CI.

## Treino CAT

O treino adaptativo permite selecionar entre 20 e 80 questões. A sessão mantém estado local e, para usuários autenticados, sincroniza com:

```text
training_sessions
training_session_answers
```

Sair da aba não deve apagar uma sessão em andamento; o histórico permite continuar posteriormente.

## Simulados

Os simulados usam 20 a 80 questões e persistem em:

```text
simulations
simulation_answers
```

O usuário pode interromper, continuar, finalizar e revisar o resultado.

## Meu Desempenho

As métricas objetivas são calculadas deterministicamente pelo aplicativo e persistidas em tabelas como:

```text
learning_events
user_performance
performance_snapshots
competency_performance
```

A IA não recalcula nem altera percentuais, Mastery Score, XP ou tendências. A Edge Function `performance-insight` exige sessão autenticada, recebe somente agregados estruturados e devolve interpretação/recomendações educacionais.

## CardioTutor e CaseCoach

A Edge Function `ecg-tutor` atende o tutor contextual e a correção dos casos. A Beta 1.1 permite uso autenticado e uso como convidado. O gateway não exige JWT para essa função porque o acesso de convidado é intencional; a função aplica validação de sessão quando um token é enviado, restrição de origem, limite de payload e rate limiting no servidor. Buckets de limite são hashados antes de serem persistidos.

Perguntas ainda não respondidas têm resposta correta/explicação removidas do contexto enviado ao tutor. Em Modo Prova, o Tutor IA permanece bloqueado até a finalização do simulado.

No ditado dos estudos de caso, o navegador converte voz em texto; o áudio não é enviado pelo ECG Lab.

## Supabase de produção

Projeto utilizado pela Beta 1.1:

```text
jkvalsckcqzwnbginmow
```

O frontend contém somente a **publishable key**, apropriada para uso público no navegador. Chaves de serviço, segredos de IA e credenciais privadas ficam fora do frontend.

As tabelas públicas de produção estão com RLS habilitado. Dados de usuário são protegidos por políticas baseadas em `auth.uid()`; `ai_request_limits` não possui política cliente por design e é acessada pelo fluxo server-side de limite da IA.

### Decisões de autenticação do beta

No estado atual, cadastros por e-mail/senha são auto-confirmados para reduzir atrito de onboarding. Isso significa que a propriedade do e-mail não é comprovada no cadastro. A proteção do Supabase contra senhas conhecidas como vazadas também deve ser habilitada antes de um rollout público mais amplo.

### Importante sobre `supabase/schema.sql`

`supabase/schema.sql` é um documento legado de bootstrap e não deve ser executado sobre o banco de produção atual. Para mudanças futuras no banco, use migrações incrementais e revise o estado real antes de aplicar DDL.

## Feedback do beta

O formulário de feedback grava em `beta_feedback` para usuários autenticados e mantém fila local quando não consegue sincronizar. São enviados categoria, descrição digitada pelo usuário e metadados técnicos básicos como página, idioma, versão, plataforma e viewport. Tokens de autenticação e e-mail não são anexados automaticamente ao feedback.

## Pipeline de produção — Beta 1.1

`.github/workflows/pages.yml` bloqueia o deploy quando falham verificações como:

1. patches idempotentes do runtime;
2. geração dos 114 SVGs e 42 PDFs;
3. sintaxe de todos os scripts ativos;
4. existência de todas as referências JS/CSS do `index.html`;
5. identidade `1.1.0-beta.1`;
6. integridade de 114 casos/114 questões da biblioteca de treino;
7. auditoria efetiva dos **210 estudos de caso em PT e EN**;
8. presença e integridade dos 20 casos de Isquemia/ST-T e seus ECGs sintéticos;
9. presença das interações do visualizador/zoom dos estudos de caso;
10. regressões essenciais de navegação, treino, simulados, desempenho, Tutor e feedback;
11. varredura de segredos no frontend;
12. validação dos SVGs/PDFs;
13. montagem de artefato limpo, sem arquivos Python, SQL, `.github`, scripts de build ou Supabase;
14. deploy no GitHub Pages somente após sucesso do job de validação.

A auditoria clínica adicional em `.github/workflows/study-case-audit.yml` também roda em `push`, `pull_request` e manualmente.

## Rodar localmente como produção

Na raiz do repositório:

```bash
python -m pip install reportlab cairosvg pypdf
python scripts/patch_i18n.py
python scripts/patch_app_language.py
python scripts/patch_mobile_zoom.py
python scripts/patch_simulation_autofinish.py
python scripts/patch_training_performance_focus.py
python scripts/patch_floating_tutor_nav.py
python scripts/generate_ecg_svgs.py
python scripts/generate_lesson_pdfs.py
node scripts/audit_effective_study_cases.js
python -m http.server 8000
```

Depois abra `http://localhost:8000`.

## Limites conhecidos da Beta 1.1

- o painel administrativo legado de autoria de conteúdo não faz parte do rollout público;
- respostas corretas da biblioteca educacional existem no bundle do navegador, portanto a plataforma é adequada para aprendizagem, não para avaliações de alta segurança;
- ditado depende do suporte de reconhecimento de voz do navegador;
- funções de IA dependem da disponibilidade do provedor externo e possuem comportamento de fallback/erro controlado;
- há arquivos legados de versões anteriores ainda preservados no repositório, mas eles não são carregados no bundle de produção;
- auto-confirmação de e-mail e proteção contra senhas vazadas devem ser reavaliadas antes de ampliar o beta para público aberto.

Consulte `BETA_1_1_READINESS.md` para o registro técnico da revisão de lançamento.
