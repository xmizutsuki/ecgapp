# Supabase — ECG Lab Beta 1.0

O banco de produção da Beta 1.0 evoluiu além do `schema.sql` original.

## Regra principal

**Não execute `schema.sql` sobre o projeto de produção atual.** Ele representa o bootstrap legado de uma fase anterior e contém nomes/estruturas de conteúdo que não correspondem integralmente ao banco ativo.

Mudanças novas devem ser incrementais e idempotentes. Antes de qualquer DDL:

1. inspecione o esquema real do projeto;
2. confirme RLS e políticas existentes;
3. aplique somente a migração necessária;
4. rode os Security/Performance Advisors novamente;
5. valide treino, simulados, desempenho, autenticação e Tutor.

## Suites atuais

- `training_suite.sql` — persistência do CAT;
- `simulation_suite.sql` — persistência dos simulados;
- `performance_suite.sql` — eventos e agregados de desempenho;
- `tutor_suite.sql` — conversas/sinais educacionais do Tutor;
- `beta_feedback.sql` — feedback da fase beta;
- `beta_1_0_live_hardening.sql` — permissões e índices de endurecimento da Beta 1.0.

## Edge Functions

A Beta 1.0 usa:

- `ecg-tutor` — CardioTutor e CaseCoach;
- `performance-insight` — interpretação educacional de métricas estruturadas.

Ambas devem permanecer com verificação JWT habilitada. Segredos do provedor de IA ficam somente no ambiente das Edge Functions.

## Produção

O frontend usa apenas URL do projeto e publishable key. Dados do usuário permanecem protegidos por RLS. Os ECGs e PDFs educacionais publicados no GitHub Pages são gerados no build e independem do Supabase Storage.
