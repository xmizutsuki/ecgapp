# ECG Lab — revisão técnica da versão 2026-09-03

Esta revisão acompanha a atualização completa da plataforma antes do merge em `main`.

## Problemas encontrados e corrigidos

1. **`index.html` apontava para arquivos que não existiam** (`real_cases_en*.js`, `study_content_en*.js` e `release_features.js`). A página poderia abrir com múltiplos 404 e as melhorias novas não eram carregadas.
   - Corrigido: o HTML agora carrega apenas arquivos reais do repositório e usa `study_casecoach_features.js` + `simulation_features.js` após `app.js`.

2. **O workflow exigia arquivos ingleses inexistentes e chamava um gerador de PDFs que ainda não existia.**
   - Corrigido: foi criado `scripts/generate_lesson_pdfs.py` e o workflow foi refeito para validar pull requests antes do merge.

3. **O CaseCoach enviava `mode: case-feedback`, mas a Edge Function aceitava apenas `message`.**
   - Corrigido: `ecg-tutor` agora possui fluxo específico para `case-feedback`, valida o payload, solicita feedback JSON ao modelo, normaliza a resposta e devolve `feedback` estruturado ao frontend.

4. **A localização dinâmica tinha risco de substituir palavras curtas dentro de outras palavras.**
   - Corrigido no build: `scripts/patch_i18n.py` aplica substituição com limites Unicode de palavras antes da validação e do deploy.

5. **Documentação estava divergente do código**, incluindo referência a bundles ingleses separados e modelo de IA antigo.
   - Corrigido: README e notas de revisão agora descrevem a arquitetura realmente publicada.

## Itens validados pelo build

- 114 traçados ECG vetoriais SVG.
- 19 categorias × 6 variações.
- Lead II, 10 segundos, visualização responsiva e zoom.
- Treino adaptativo com progressão por desempenho.
- Trilha de estudos integralmente liberada.
- 21 aulas e 190 estudos de caso fictícios.
- Seletor Português / English antes da entrada.
- Localização dinâmica endurecida contra substituição destrutiva de substrings.
- CaseCoach por texto/voz e modo estruturado `case-feedback` no backend.
- Simulado personalizado de 20 a 80 questões.
- 42 PDFs: 21 PT + 21 EN.
- Cada PDF possui exatamente 6 páginas.
- Verificação de referências locais de `<script>` do `index.html`.
- Verificação de sintaxe de todos os JavaScript relevantes.
- Verificação de sintaxe dos scripts Python.
- Bloqueio de publicação se documentação/interface voltar a afirmar incorretamente que os traçados sintéticos são ECGs reais de pacientes.

## Biblioteca ECG

O gerador `scripts/generate_ecg_svgs.py` cria os traçados com `viewBox` 2800 × 900, linha principal de 1.4 e calibração de 1.05. O objetivo é manter leitura nítida em alta resolução sem engrossar artificialmente o traçado.

Os ECGs são reconstruções educacionais. A biblioteca de uma derivação é destinada principalmente ao reconhecimento de ritmo. Isquemia, eixo, bloqueios de ramo e outros diagnósticos dependentes de morfologia multiderivação devem ser estudados em ECG de 12 derivações.

## PDFs e referências

`generate_lesson_pdfs.py` gera 21 guias por idioma. Cada guia tem seis páginas: visão geral, fisiologia, critérios, diferenciais, raciocínio/armadilhas e revisão/referências.

Guyton & Hall, 15ª edição, é a referência fisiológica principal. O conteúdo também aponta para diretrizes temáticas ACC/AHA/HRS, incluindo fibrilação atrial 2023, SVT 2015, bradicardia/condução 2018, arritmias ventriculares 2017 e síndrome coronariana aguda 2025.

## IA e segurança

A Edge Function usa `gpt-5.6-luna` como padrão, configurável por `OPENAI_MODEL`. A `OPENAI_API_KEY` deve permanecer somente nos secrets do Supabase. Nenhuma chave privada é incluída no repositório.

O modo demonstração permanece funcional sem Supabase. Login real, persistência e correção real por IA exigem configurar `config.js`, aplicar o schema e publicar a Edge Function.

## Escopo educacional

Os traçados e casos são simulações/reconstruções para treinamento. A plataforma não deve ser usada como ferramenta de diagnóstico de pacientes reais nem substituir avaliação clínica, protocolos institucionais ou julgamento profissional.
