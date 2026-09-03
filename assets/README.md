# ECG assets

The production ECG SVG library is generated automatically during the GitHub Pages build by `scripts/generate_ecg_svgs.py`.

The generator creates **114 educational vector rhythm strips**: 19 rhythm categories × 6 variations, under `assets/ecg/<category>/`.

This keeps the repository manageable while ensuring the deployed site always contains every image path referenced by `real_cases.js` and `study_content.js`.

The tracings are educational simulations and are not patient ECGs or a substitute for clinical interpretation.
