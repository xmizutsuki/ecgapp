# Biblioteca de ECG do ECG Lab

## O que mudou

A versão atual **não depende de imagens rasterizadas de ECGs externos** para o treinamento principal.

Os traçados foram reconstruídos **do zero em SVG vetorial**, usando padrões eletrocardiográficos educacionais e o mesmo estilo visual padronizado de papel milimetrado. Isso foi feito para resolver a perda de definição em telas grandes e em dispositivos móveis.

## Biblioteca

A biblioteca contém **114 traçados**, distribuídos em **19 temas**, com **6 variações por tema**:

- Ritmo sinusal
- Bradicardia sinusal
- Taquicardia sinusal
- Arritmia sinusal
- Fibrilação atrial
- Flutter atrial
- Taquicardia supraventricular
- TSV paroxística
- Ritmo estimulado por marcapasso
- Bigeminismo ventricular
- Trigeminismo ventricular
- Extrassístole ventricular (PVC)
- Extrassístole atrial (PAC)
- BAV de 1º grau
- BAV de 2º grau — Mobitz I
- BAV de 2º grau — Mobitz II
- BAV de 3º grau
- Taquicardia ventricular
- Fibrilação ventricular

Cada arquivo é um SVG de 10 segundos em Lead II e permanece nítido independentemente do nível de zoom.

## Natureza dos traçados

Os ECGs são **simulações/reconstruções educacionais**. Eles não pertencem a pacientes e não são cópias de exames clínicos individuais.

Eles devem ser usados para **treinamento de reconhecimento de padrões**, não para diagnóstico, laudo ou tomada de decisão clínica em um paciente real.


## Trilha de estudos — atribuição externa

A trilha não redistribui vídeos nem transcreve integralmente material de terceiros. Ela cria resumos próprios e aponta para:

- Ninja Nerd: https://www.youtube.com/watch?v=CNN30YHsJw0
- ICU Advantage: https://www.youtube.com/watch?v=cbdntsZYRSU
- ICU Advantage — Heart Blocks: https://www.youtube.com/watch?v=h8gtR-eyPTc
- Strong Medicine — AV Block: https://www.youtube.com/live/iiinZvwBSuE
- Nurse Cheung — Pacemaker Rhythms: https://www.youtube.com/watch?v=wAPe19aNRfQ
- MedCram — ST Elevation: https://www.youtube.com/watch?v=8ajWCLqz3VQ
- NCBI Bookshelf / StatPearls: links específicos aparecem em cada aula.

Todo caso clínico presente no `study_content.js` é fictício e foi criado para treinamento. Nenhum caso representa paciente real.
