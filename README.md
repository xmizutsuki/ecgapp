# ECG Lab — Beta 1.0

Aplicação web educacional bilíngue (Português / English) para treino estruturado de interpretação eletrocardiográfica.

> **Versão:** `1.0.0-beta.1`  
> **Produção:** https://xmizutsuki.github.io/ecgapp/

## Escopo da Beta 1.0

A Beta 1.0 é focada na experiência do estudante. O conteúdo educacional curado permanece empacotado no frontend e é reconstruído/validado no pipeline de publicação; o Supabase é usado para autenticação, sincronização do progresso, persistência das sessões, feedback beta e funções de IA.

Principais recursos:

- **114 traçados educacionais vetoriais** em 19 categorias, com 6 variações por categoria;
- treino adaptativo CAT de **20 a 80 questões**, com salvamento e retomada;
- simulados de **20 a 80 questões**, histórico, resultado e revisão;
- **21 aulas** e **190 estudos de caso fictícios**;
- **42 PDFs** de 6 páginas: 21 em português + 21 em inglês;
- Meu Desempenho consolidando treino, simulados e estudos de caso;
- CardioTutor flutuante com contexto da tela e proteção contra entrega da resposta antes da tentativa;
- CaseCoach com texto/ditado e feedback educacional por IA;
- análise de desempenho por IA usando apenas agregados calculados pelo aplicativo;
- modo demonstração local;
- feedback do beta com metadados técnicos não sensíveis;
- layout responsivo para desktop, tablet e mobile.

## Aviso educacional

Os traçados e casos são reconstruções/simulações para ensino. Não representam ECGs ou pacientes reais e não substituem avaliação clínica, laudo profissional, protocolos institucionais ou julgamento clínico.

## Conteúdo e ECGs vetoriais

Os traçados não são PNGs ampliados. Eles são gerados como SVG pelo script:

```text
scripts/generate_ecg_svgs.py
```

O build cria:

```text
assets/ecg/<ritmo>/<ritmo>_01.svg ... <ritmo>_06.svg
```

O pipeline valida quantidade, XML, conteúdo ativo proibido e integridade da biblioteca. As fontes, limitações e critérios estão documentados em `DATA_SOURCES.md` e `ECG_LIBRARY_MANIFEST.md`.

## Trilha de estudos e PDFs

A trilha contém 21 aulas e 190 casos clínicos fictícios. Cada aula possui um PDF aprofundado em português e outro em inglês, gerados por:

```text
scripts/generate_lesson_pdfs.py
```

O build exige 21 PDFs por idioma e 6 páginas por arquivo. A referência fisiológica principal é **Guyton and Hall Textbook of Medical Physiology, 15th ed.**; diretrizes específicas complementam os temas. Nenhuma figura protegida do tratado é reproduzida.

## Português / English

Na primeira abertura, o usuário escolhe Português (Brasil) ou English. A preferência fica salva localmente. A interface e o conteúdo dinâmico usam `i18n.js`, `english_content.js`, `english_content_finalize.js` e `localize_data.js`, com validação bilíngue no CI.

## Treino CAT

O treino adaptativo permite selecionar entre 20 e 80 questões. A sessão mantém estado local e, para usuários autenticados, sincroniza com:

```text
training_sessions
training_session_answers
```

Sair da aba não deve apagar uma sessão em andamento. O histórico permite continuar posteriormente.

## Simulados

Os simulados também usam 20 a 80 questões e persistem em:

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

A IA **não recalcula nem altera** percentuais, Mastery Score, XP ou tendências. A Edge Function `performance-insight` recebe somente agregados estruturados e devolve interpretação/recomendações educacionais.

## CardioTutor e CaseCoach

A Edge Function `ecg-tutor` atende os modos de tutor contextual e correção de caso. Ela exige sessão autenticada e protege perguntas não respondidas, removendo resposta correta/explicação do contexto antes da tentativa.

Os textos enviados são educacionais. No ditado, o navegador converte voz em texto; o áudio não é enviado pelo ECG Lab.

## Supabase de produção

Projeto utilizado pela Beta 1.0:

```text
jkvalsckcqzwnbginmow
```

O frontend contém somente a **publishable key**, apropriada para uso público no navegador. Chaves de serviço, segredos de IA e credenciais privadas ficam fora do frontend.

A produção possui RLS habilitado nas tabelas públicas e políticas de propriedade por `auth.uid()` para dados do usuário. As funções de IA usam JWT obrigatório.

### Importante sobre `supabase/schema.sql`

`supabase/schema.sql` é um **documento legado de bootstrap** de uma fase anterior do projeto e não deve ser executado sobre o banco de produção atual. A produção evoluiu para um esquema diferente, com `question_options`, `question_topics`, suites de treino/simulação/desempenho e migrações específicas do beta.

Para mudanças futuras no banco, use migrações incrementais e revise o estado real antes de aplicar DDL.

## Feedback do beta

O formulário de feedback grava em `beta_feedback` para usuários autenticados. São enviados apenas:

- categoria e descrição digitadas pelo usuário;
- página, idioma e versão do app;
- user agent/plataforma e viewport.

Tokens de autenticação e e-mail não são anexados automaticamente ao feedback.

## Pipeline de produção

`.github/workflows/pages.yml` executa, entre outras verificações:

1. patches idempotentes do runtime;
2. geração dos 114 SVGs;
3. geração dos 42 PDFs;
4. sintaxe de todos os scripts ativos;
5. existência de todas as referências JS/CSS do `index.html`;
6. integridade de 114 casos/114 questões e exatamente uma resposta correta;
7. integridade das 21 aulas/190 estudos de caso nos dois idiomas;
8. regressões de navegação/sessão e visualizador mobile;
9. varredura de segredos no frontend;
10. validação dos SVGs/PDFs;
11. montagem de um artefato limpo, sem scripts Python, SQL, `.github` ou arquivos Supabase;
12. deploy no GitHub Pages somente após sucesso em `main`.

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
python -m http.server 8000
```

Depois abra `http://localhost:8000`.

## Limites conhecidos da Beta 1.0

- o painel administrativo legado de autoria de conteúdo não faz parte do rollout público da Beta 1.0;
- respostas corretas da biblioteca educacional existem no bundle do navegador, portanto a plataforma é adequada para aprendizagem, não para provas de alta segurança;
- ditado depende do suporte de reconhecimento de voz do navegador;
- funções de IA dependem da disponibilidade do provedor externo e possuem fallback de interface quando indisponíveis.

Consulte `BETA_1_0_READINESS.md` para o registro técnico da revisão de lançamento.
