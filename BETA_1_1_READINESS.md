# ECG Lab — Beta 1.1 Release Readiness

**Data da revisão:** 05/09/2026  
**Versão candidata:** `1.1.0-beta.1`  
**Escopo:** plataforma educacional de treinamento em eletrocardiografia; não destinada a diagnóstico clínico.  
**Status recomendado:** **APTO COM RESSALVAS para beta controlada**.

## Resumo executivo

A revisão de pré-release cobriu estrutura do frontend, ordem de carregamento, conteúdo PT/EN, biblioteca de ECG, estudos de caso, Isquemia/ST-T, zoom dos casos, treino CAT, simulados, desempenho, Tutor IA/CaseCoach, autenticação, banco Supabase, RLS, Edge Functions, pipeline de build/deploy, documentação e riscos de regressão.

A Beta 1.1 pode ser usada em um grupo controlado de estudantes/profissionais para avaliação educacional e coleta de feedback. Ela **não** deve ser apresentada como ferramenta de diagnóstico, laudo ou apoio à decisão clínica em pacientes reais.

## Escopo validado

- 114 casos/traçados da biblioteca principal e 114 questões em 19 categorias;
- 21 aulas da trilha;
- 210 estudos de caso em Português e English;
- 20 casos de Isquemia/ST-T com ECG sintético de 12 derivações;
- zoom dos ECGs dos estudos de caso com botões, roda do mouse, pan, duplo clique, pinch e fullscreen;
- 21 PDFs em português + 21 PDFs em inglês;
- treino adaptativo CAT de 20 a 80 questões, histórico, salvamento e retomada;
- simulados de 20 a 80 questões, persistência, retomada, finalização e revisão;
- Meu Desempenho com dados de treino, simulados e atividades;
- Tutor IA flutuante e CaseCoach;
- feedback do beta e recuperação de senha;
- Supabase de produção, RLS e políticas de acesso;
- Edge Functions de IA;
- GitHub Actions, validação do bundle e deploy no GitHub Pages;
- responsividade e camadas finais de interface carregadas pelo bundle de produção;
- documentação da release.

## Correções feitas durante a revisão

1. A identidade do aplicativo foi elevada de `1.0.0-beta.1` para `1.1.0-beta.1` em `config.js`.
2. A auditoria clínica efetiva passou de 190 para **210 casos**, incluindo a nova aula de Isquemia/ST-T nas duas línguas.
3. A auditoria agora valida IDs, campos obrigatórios, dificuldade, SVG dos 20 ECGs de Isquemia/ST-T, legenda e integridade dos casos.
4. O workflow de auditoria de casos passou a executar também em todo `push` para `main`.
5. A ordem de carregamento de dados, Isquemia/ST-T e zoom passou a ser verificada automaticamente.
6. O gate de produção foi atualizado para a Beta 1.1 e agora valida todos os scripts ativos do `index.html` com `node --check`.
7. O gate passou a validar explicitamente os 114 casos/114 questões em PT e EN, alternativas, dificuldade e vínculos caso↔questão.
8. O gate passou a validar os 210 estudos de caso efetivos e os 20 casos de Isquemia/ST-T.
9. O visualizador dos estudos de caso passou a ter verificações automáticas de zoom, wheel, touch/pinch e fullscreen.
10. O pipeline mantém validação dos 114 SVGs, 42 PDFs, varredura de conteúdo ativo em SVG, scan de segredos e artefato de deploy limpo.
11. O README foi atualizado para refletir a arquitetura e as limitações reais da Beta 1.1.

## Backend e segurança revisados

### Supabase

O projeto de produção está ativo. As tabelas públicas revisadas possuem RLS habilitado. As políticas de dados de usuário utilizam `auth.uid()` para limitar acesso ao proprietário. A tabela `ai_request_limits` não possui política de cliente por design e é utilizada pelo fluxo server-side de limitação da IA.

### Tutor IA

`ecg-tutor` aceita convidado por decisão de produto. A ausência de JWT obrigatório no gateway não significa acesso irrestrito à aplicação: a função valida a sessão quando um token é fornecido, restringe origem de navegador, limita tamanho de payload e aplica rate limiting server-side usando buckets hashados.

`performance-insight` permanece com autenticação/JWT obrigatórios.

## Ressalvas antes de ampliar o beta

### 1. Proteção contra senhas vazadas — recomendada antes de beta público amplo

O advisor de segurança do Supabase indica que a proteção contra senhas conhecidas como vazadas está desabilitada. Não bloqueia um beta controlado, mas deve ser habilitada antes de abrir cadastro para público maior.

### 2. E-mail auto-confirmado — decisão atual de onboarding

O fluxo atual auto-confirma cadastros e, portanto, não comprova que o usuário realmente possui o endereço de e-mail informado. Para beta controlado isso pode ser aceito conscientemente; antes de lançamento público amplo, recomenda-se reativar confirmação de e-mail.

### 3. Respostas educacionais estão no bundle do navegador

Como o conteúdo educacional é empacotado no cliente, uma pessoa tecnicamente avançada pode inspecionar respostas. O produto é adequado para aprendizagem e autoavaliação, mas não para prova de alta segurança/proctoring.

### 4. Dependência externa da IA

Tutor e insights dependem da disponibilidade do provedor de IA. O restante do aplicativo deve continuar utilizável quando a IA estiver indisponível, mas esse cenário deve continuar sendo observado durante o beta.

### 5. Reconhecimento de voz depende do navegador

Ditado não é igualmente suportado em todos os navegadores/plataformas. O campo de texto permanece como alternativa principal.

### 6. Código legado preservado

Há arquivos/hotfixes de versões anteriores no repositório. Eles não são carregados pelo bundle de produção atual, mas devem ser consolidados/removidos em uma etapa futura para reduzir dívida técnica e risco de manutenção.

### 7. Fallback interno antigo de versão

`beta_runtime.js` ainda contém `1.0.0-beta.1` apenas como fallback caso `window.ECG_CONFIG.APP_VERSION` não exista. No bundle de produção, `config.js` é carregado antes e define `1.1.0-beta.1`, portanto a versão efetiva e os metadados do beta usam 1.1. Esse fallback pode ser limpo em uma refatoração curta posterior.

## Go / No-Go

### Beta 1.1 controlada — GO com ressalvas

Critérios:

- uso educacional;
- público limitado/controlado inicialmente;
- coleta ativa de feedback;
- monitoramento de erros e funções de IA;
- nenhum posicionamento como ferramenta clínica/diagnóstica;
- acompanhar as ressalvas de autenticação antes de ampliar a distribuição.

### Lançamento público amplo — condicionado

Antes de ampliar para público irrestrito, recomenda-se no mínimo:

- habilitar proteção contra senhas vazadas;
- decidir formalmente se confirmação de e-mail será obrigatória;
- revisar métricas/erros coletados durante a Beta 1.1;
- consolidar código legado de maior risco;
- repetir o checklist de regressão com dados reais do beta.

### Uso clínico/diagnóstico — NO-GO

O ECG Lab é uma plataforma educacional. Esta revisão não valida o aplicativo como dispositivo médico, software de diagnóstico, sistema de prescrição ou suporte à decisão clínica.

## Critério final de publicação

A tag/status de release deve ser considerada fechada somente quando os workflows do GitHub Actions do commit final da Beta 1.1 concluírem com sucesso, incluindo:

- `Validate and deploy ECG Lab`;
- `Audit study case clinical consistency`.

Qualquer falha nesses gates reabre a release até correção e nova execução bem-sucedida.
