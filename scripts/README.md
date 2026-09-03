# Build scripts

- `generate_ecg_svgs.py` — gera deterministicamente os **114 SVGs educacionais** em Lead II (19 categorias × 6 variações).
- `generate_lesson_pdfs.py` — gera os **42 PDFs da trilha** (21 PT + 21 EN), com 6 páginas por aula.
- `patch_i18n.py` — endurece a localização bilíngue usando limites Unicode de palavras para evitar substituições destrutivas dentro de outros termos.
- `patch_app_language.py` — garante que o CardioTutor receba o idioma selecionado na interface.

O workflow do GitHub Pages executa os quatro scripts antes de validar o bundle. Pull requests para `main` executam a validação sem publicar; pushes em `main` validam e publicam o site.
