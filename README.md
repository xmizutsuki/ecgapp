# ECG Lab — Plataforma Web de Treinamento em ECG

Versão completa com biblioteca de ECG reconstruída em **SVG vetorial**.

## Principal melhoria desta versão

O problema de resolução foi eliminado na origem. Em vez de ampliar PNGs ou recortar ECGs de baixa resolução, o aplicativo utiliza traçados criados do zero como gráficos vetoriais.

Isso significa que o ECG permanece nítido em:

- celular;
- tablet;
- notebook;
- monitor Full HD;
- monitor 2K/4K;
- modo tela cheia;
- zoom de até 8× no aplicativo.

## Biblioteca incluída

- **114 traçados educacionais**;
- **19 temas**;
- **6 variações diferentes de cada tema**;
- arquivos locais, sem depender da internet para carregar os ECGs;
- uma única derivação longa em **Lead II**, priorizando reconhecimento de ritmo;
- grade ECG padronizada;
- visualização responsiva;
- zoom por botões e roda do mouse;
- arraste horizontal/vertical;
- duplo clique para ampliar;
- tela cheia.

Os temas e limitações da biblioteca estão descritos em `DATA_SOURCES.md`.

## Rodar localmente

Abra `index.html` em um navegador moderno.

O modo demonstração funciona sem Supabase.

## Publicar no GitHub Pages

O repositório inclui `.github/workflows/pages.yml`. Cada push para `main` gera os 114 SVGs, cria os 42 PDFs bilíngues, valida o bundle e publica o site pelo GitHub Actions/Pages. Em `Settings → Pages`, a origem deve estar configurada para **GitHub Actions**.

O endereço deste repositório no GitHub Pages é:

```text
https://xmizutsuki.github.io/ecgapp/
```

## Arquivos essenciais

```text
index.html
styles.css
app.js
config.js
real_cases.js
assets/ecg/
```

**A pasta `assets/ecg` é essencial**, pois contém os 114 traçados SVG.

## Supabase

É opcional para a demonstração. Para login real, persistência de progresso e funções administrativas, configure `config.js` e execute os scripts da pasta `supabase`.

Nunca publique chaves privadas, `service_role`, senha do banco ou `OPENAI_API_KEY` no GitHub.

## Aviso educacional

Os traçados incluídos são reconstruções/simulações para ensino. Não representam ECGs de pacientes e não substituem avaliação clínica, laudo profissional, protocolos institucionais ou julgamento clínico.

## Treino adaptativo (CAT)

O modo **Treinar ECG** não segue mais uma sequência fixa por tema. Ele usa seleção adaptativa inspirada em testes computadorizados adaptativos:

- as 3 primeiras questões são de dificuldade 1;
- todas as categorias elegíveis são misturadas;
- o mesmo tema é evitado em questões consecutivas quando há alternativas no banco;
- acertos elevam gradualmente a dificuldade estimada;
- erros reduzem/estabilizam a dificuldade;
- categorias com menor desempenho recebem maior probabilidade de reaparecer;
- questões já vistas são evitadas até o banco disponível precisar ser reciclado;
- não é possível pular uma questão sem responder;
- o diagnóstico do traçado fica oculto até a resposta ser confirmada.

O algoritmo é educacional e inspirado no conceito de CAT; não reproduz nem afirma reproduzir o algoritmo oficial do NCLEX.


## Trilha de estudos v3

- Todos os módulos e aulas ficam liberados desde o primeiro acesso.
- 21 aulas autorais, do básico a isquemia/ST-T.
- 190 estudos de caso fictícios: 10 para cada tipo de ritmo da biblioteca.
- Cada caso combina anamnese, sinais vitais, exame físico, laboratório, imagem/outros exames, ECG vetorial, pergunta, resposta comentada e uma pegadinha leve.
- Conteúdo audiovisual de terceiros não é copiado: o app oferece somente links para os vídeos nos canais originais do YouTube, com canal/título visíveis.
- Referências externas são listadas ao final de cada aula; o texto principal é síntese autoral do ECG Lab.

### Fontes educacionais externas usadas na trilha

- Ninja Nerd — ECG Basics.
- ICU Advantage — Complete ECG Rhythm Interpretation Series e Heart Blocks Made Easy.
- Strong Medicine — AV Block.
- Nurse Cheung — Pacemaker Rhythms.
- MedCram — ST Elevation / ECG Interpretation.
- NCBI Bookshelf / StatPearls — referências de aprofundamento por ritmo.

Os links permanecem sob controle de seus respectivos autores/plataformas e podem mudar ou ser removidos.


## Português / English

Esta versão possui seleção de idioma antes da entrada no aplicativo. Na primeira abertura, o usuário escolhe **Português (Brasil)** ou **English**. A preferência é salva localmente no navegador e pode ser alterada pelo botão de idioma no topo do aplicativo.

A localização inclui interface, treinamento adaptativo, questões, alternativas, explicações, trilha de estudos, módulos, aulas e estudos de caso. Títulos originais de vídeos e links externos permanecem associados à fonte original.

## Correção de estudos de caso com voz/texto + IA

Cada estudo de caso agora possui uma área de **recordação ativa** antes da resposta comentada:

- o aluno pode escrever sua interpretação em texto;
- em navegadores compatíveis, pode ditar a resposta pelo microfone usando reconhecimento de voz do navegador;
- o texto é enviado ao `ecg-tutor` para avaliação pedagógica;
- a IA devolve nota de 0–100, pontos corretos, correções, provável motivo do erro, raciocínio correto passo a passo, resposta-modelo e o que observar na próxima tentativa;
- a última tentativa fica salva localmente no navegador por caso e idioma;
- se o backend de IA não estiver configurado, o app exibe um feedback local de referência claramente identificado como não-IA.

### Ativar a correção por IA

A chave da OpenAI deve permanecer **somente no Supabase**, nunca no GitHub ou no JavaScript do navegador.

1. Configure o Supabase em `config.js`.
2. Defina o secret `OPENAI_API_KEY` no projeto Supabase.
3. Opcionalmente, defina `OPENAI_MODEL` (o padrão do projeto é `gpt-5.4-mini`).
4. Publique novamente a Edge Function:

```bash
supabase functions deploy ecg-tutor
```

O modo `case-feedback` da função utiliza resposta estruturada para manter o feedback consistente entre os casos.

### Voz e privacidade

O reconhecimento de voz é um recurso oferecido pelo navegador e pode não existir em todos os dispositivos. O aplicativo envia ao backend do ECG Lab apenas o **texto resultante** da transcrição e os dados do caso fictício; o tratamento do áudio pelo mecanismo de reconhecimento depende do navegador utilizado.

## Simulados personalizados
A aba **Simulados** permite selecionar livremente entre **20 e 80 questões**. O usuário pode usar o controle deslizante ou atalhos de 20, 40, 60 e 80 questões. As questões são embaralhadas a cada tentativa e o resultado é apresentado ao final. A interface acompanha o idioma selecionado no app.


## PDFs aprofundados da Trilha de Estudos
Cada uma das 21 aulas possui um guia PDF de 6 páginas em Português e em English, aberto conforme o idioma selecionado no app. Os guias incluem fisiologia, ECG vetorial do próprio projeto, diagramas originais, critérios de reconhecimento, diferenciais, raciocínio clínico, pegadinhas, autoavaliação e referências.

A referência fisiológica principal é **Hall JE, Hall ME. Guyton and Hall Textbook of Medical Physiology, 15th ed. Elsevier (2025), especialmente Unidade III, capítulos 9-13**. Para critérios e contexto clínico, são adicionadas diretrizes ACC/AHA/HRS específicas. Nenhuma figura ou trecho extenso de Guyton & Hall é reproduzido: todas as figuras, diagramas e traçados incorporados aos PDFs são criações/reconstruções educacionais do ECG Lab.

Os PDFs ficam em `assets/lessons/pt/` e `assets/lessons/en/`. O script `scripts/generate_lesson_pdfs.py` reconstrói a biblioteca.
