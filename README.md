# ECG Lab — Plataforma Web de Treinamento em ECG

Aplicação web educacional bilíngue (Português / English) para treino estruturado de interpretação eletrocardiográfica.

## O que esta versão entrega

- **114 traçados educacionais em SVG vetorial**;
- **19 temas de ritmo**, com **6 variações por tema**;
- Lead II longo de 10 segundos para treino de reconhecimento de ritmo;
- visualizador responsivo com zoom de até 8×, arraste e tela cheia;
- treinamento adaptativo por desempenho;
- trilha com **21 aulas** e **190 casos clínicos fictícios**;
- CaseCoach com resposta em texto, ditado por voz do navegador e correção pedagógica por IA quando o backend está configurado;
- simulados personalizados entre **20 e 80 questões**;
- **42 PDFs de 6 páginas** gerados no build: 21 em português + 21 em inglês;
- modo demonstração sem Supabase;
- GitHub Actions com validação em pull requests e publicação automática no GitHub Pages após merge em `main`.

## ECGs vetoriais

O problema de perda de resolução foi eliminado na origem. Os traçados não são PNGs ampliados: são reconstruídos do zero como SVGs e permanecem nítidos em celular, tablet, notebook, monitores de alta resolução, zoom e tela cheia.

A biblioteca é gerada deterministicamente por:

```text
scripts/generate_ecg_svgs.py
```

Durante o build são criados:

```text
assets/ecg/<ritmo>/<ritmo>_01.svg ... <ritmo>_06.svg
```

Os arquivos gerados não precisam ser versionados individualmente no GitHub; o workflow os recria antes da validação e do deploy.

Os temas, fontes e limitações estão documentados em `DATA_SOURCES.md` e `ECG_LIBRARY_MANIFEST.md`.

## Trilha de estudos

Todos os módulos ficam liberados desde o primeiro acesso. A trilha contém:

- 21 aulas, do método básico de leitura a isquemia/ST-T;
- 190 estudos de caso fictícios;
- anamnese, sinais vitais, exame físico, laboratório, imagem/outros exames e ECG educacional;
- pergunta de raciocínio antes da resposta comentada;
- pegadinhas leves e pontos de aprendizagem;
- links para vídeos externos no canal original, sem copiar ou redistribuir os vídeos;
- referências para aprofundamento.

A aula de isquemia deixa explícito que localização de isquemia, eixo, bloqueios de ramo e vários diagnósticos morfológicos exigem ECG de 12 derivações; Lead II isolada é usada principalmente para treino de ritmo.

## PDFs aprofundados

Cada aula possui um guia PDF de 6 páginas em português e em inglês. Os PDFs são gerados por:

```text
scripts/generate_lesson_pdfs.py
```

O workflow produz:

```text
assets/lessons/pt/*.pdf
assets/lessons/en/*.pdf
```

Cada guia inclui visão geral, fisiologia, critérios de reconhecimento, um traçado vetorial quando aplicável, diagnósticos diferenciais, raciocínio clínico, armadilhas, autoavaliação e referências.

A referência fisiológica principal é **Guyton and Hall Textbook of Medical Physiology, 15th ed.**. Diretrizes específicas complementam o conteúdo, incluindo AF 2023, SVT 2015, bradicardia/condução 2018, arritmias ventriculares 2017 e síndrome coronariana aguda 2025. Nenhuma figura do tratado é reproduzida; os traçados usados nos PDFs são reconstruções do próprio ECG Lab.

## Português / English

Na primeira abertura, o usuário escolhe **Português (Brasil)** ou **English**. A preferência é salva localmente.

A interface e o conteúdo dinâmico usam `i18n.js` + `localize_data.js`. Antes de publicar, o build executa `scripts/patch_i18n.py`, que torna a substituição de termos sensível a limites de palavras e evita corrupção de substrings por traduções curtas. O payload do CardioTutor também recebe o idioma selecionado.

Títulos originais de vídeos e URLs externos permanecem associados às fontes originais.

## CaseCoach — texto, voz e IA

Nos estudos de caso, o estudante pode explicar o raciocínio antes de revelar a análise.

- resposta digitada;
- ditado com `SpeechRecognition` / `webkitSpeechRecognition` quando suportado pelo navegador;
- envio do **texto transcrito**, não do áudio, ao backend do ECG Lab;
- nota de 0–100;
- pontos corretos;
- correções;
- possíveis motivos do erro;
- raciocínio correto passo a passo;
- resposta-modelo;
- o que observar na próxima tentativa.

Sem backend, o aplicativo mostra um feedback local de referência claramente identificado como não-IA.

A Edge Function `supabase/functions/ecg-tutor/index.ts` suporta dois modos:

```text
tutor
case-feedback
```

O modelo padrão configurado na função é:

```text
gpt-5.6-luna
```

Ele pode ser substituído pelo secret/variável `OPENAI_MODEL` no ambiente Supabase.

## Supabase e segurança

O Supabase é opcional no modo demonstração. Para login real, persistência e correção por IA:

1. configure `SUPABASE_URL` e a publishable/anon key em `config.js`;
2. aplique `supabase/schema.sql` e `supabase/seed.sql`;
3. defina `OPENAI_API_KEY` **somente nos secrets do Supabase**;
4. opcionalmente defina `OPENAI_MODEL`;
5. publique a função:

```bash
supabase functions deploy ecg-tutor
```

Nunca publique `OPENAI_API_KEY`, `service_role`, senha de banco ou outra chave privada no repositório ou no JavaScript do navegador.

## Simulados personalizados

A aba **Simulados** permite selecionar entre 20 e 80 questões. As questões são embaralhadas em cada tentativa, o progresso é mostrado durante o simulado e o resultado aparece ao final.

## Rodar localmente como a versão de produção

Na raiz do repositório:

```bash
python -m pip install reportlab cairosvg pypdf
python scripts/patch_i18n.py
python scripts/patch_app_language.py
python scripts/generate_ecg_svgs.py
python scripts/generate_lesson_pdfs.py
python -m http.server 8000
```

Depois abra `http://localhost:8000`.

## GitHub Pages

O workflow `.github/workflows/pages.yml`:

1. valida pull requests para `main`;
2. endurece a localização bilíngue;
3. gera 114 SVGs;
4. gera 42 PDFs;
5. valida referências de scripts, sintaxe JavaScript/Python e quantidade/paginação dos PDFs;
6. em `main`, publica o artefato no GitHub Pages.

Em **Settings → Pages**, a origem deve ser **GitHub Actions**.

Site esperado:

```text
https://xmizutsuki.github.io/ecgapp/
```

## Aviso educacional

Os traçados e casos são reconstruções/simulações para ensino. Não representam ECGs ou pacientes reais e não substituem avaliação clínica, laudo profissional, protocolos institucionais ou julgamento clínico.
