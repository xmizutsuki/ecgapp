-- ECG Lab seed
-- A biblioteca principal de ECGs usa a biblioteca vetorial educacional local por real_cases.js.
-- Os traçados são reconstruções/simulações e não pertencem a pacientes.
-- Este seed mantém somente a estrutura inicial de aulas.

insert into public.lessons(title,slug,level,position,body_md,status)
values
('Fundamentos do ECG','fundamentos',1,1,'# Fundamentos\nCalibração, papel e sequência de análise.','published'),
('Ritmo sinusal','ritmo-sinusal',2,1,'# Ritmo sinusal\nCritérios e reconhecimento.','published'),
('Fibrilação atrial','fibrilacao-atrial',3,1,'# Fibrilação atrial\nRegularidade e atividade atrial.','published'),
('Flutter atrial','flutter-atrial',3,2,'# Flutter atrial\nAtividade atrial organizada e condução AV.','published'),
('Bloqueios AV','bloqueios-av',4,1,'# Bloqueios AV\nPrimeiro, segundo e terceiro graus.','published'),
('Bloqueios de ramo','bloqueios-ramo',4,2,'# Bloqueios de ramo\nPadrões completos de ramo direito e esquerdo.','published')
on conflict (slug) do nothing;
