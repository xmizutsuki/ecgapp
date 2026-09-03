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

1. Envie **todo o conteúdo desta pasta** para a raiz do seu repositório.
2. No GitHub, abra `Settings → Pages`.
3. Source: `Deploy from a branch`.
4. Branch: `main`.
5. Folder: `/(root)`.
6. Salve.

O endereço do repositório `ecg001` continuará no formato:

```text
https://xmizutsuki.github.io/ecg001/
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
- 22 aulas autorais, do básico a isquemia/ST-T.
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
