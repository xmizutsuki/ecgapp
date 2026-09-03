# ECG Lab - revisão técnica da versão 2026-09-03

Esta revisão acompanha a atualização da versão completa da plataforma no GitHub Pages.

## Itens validados no build

- 114 traçados ECG vetoriais SVG, gerados no deploy.
- Espessura principal do traçado em 1.12 e calibração em 0.84, mantendo a revisão 20% mais fina.
- Treino adaptativo aleatório com progressão de dificuldade.
- Trilha de estudos integralmente liberada.
- 190 estudos de caso na biblioteca pedagógica.
- Seletor Português / English antes da entrada no aplicativo.
- Arquivos de conteúdo em inglês separados para evitar tradução automática destrutiva dos casos.
- Ferramenta de resposta por texto/voz nos estudos de caso e payload estruturado `case-feedback` para o tutor de IA.
- Simulado personalizado com 20 a 80 questões.
- 42 PDFs aprofundados: 21 PT + 21 EN, gerados durante o deploy.
- Verificação de sintaxe JavaScript e Python antes do GitHub Pages publicar a versão.

## Referências dos PDFs

Guyton and Hall Textbook of Medical Physiology, 15th edition, é usado como principal referência de fisiologia. Diretrizes ACC/AHA/HRS e correlatas complementam os critérios clínicos e eletrocardiográficos quando necessário. O material é síntese educacional original; não reproduz figuras ou trechos extensos do tratado.

## Limitação externa ainda existente

A interface está pronta para funcionar sem backend em modo demonstração. Login real e correção real por IA exigem configurar `config.js` com um projeto Supabase, publicar a Edge Function `ecg-tutor` e definir o secret `OPENAI_API_KEY` no Supabase. O repositório deliberadamente não contém chaves privadas.

## Escopo educacional

Os traçados são reconstruções vetoriais para treinamento. A plataforma não deve ser usada como ferramenta de diagnóstico de pacientes reais nem substituir avaliação clínica, protocolos institucionais ou julgamento profissional.
