# ECG Lab — technical review notes

This repository is a static educational ECG application. The GitHub Pages build now:

1. generates the complete vector ECG library (114 SVGs: 19 rhythms × 6 variants);
2. applies a boundary-safe bilingual translation patch;
3. validates the presence of all essential app files;
4. checks JavaScript syntax before deployment.

## ECG morphology review

The SVG generator was revised so morphology parameters are stable within each beat rather than randomly changing at every waveform sample. Sinus tachycardia keeps a visible P wave before every QRS; monomorphic VT keeps consistent polarity/morphology; AV-block patterns model dropped conduction explicitly; PVC/bigeminy/trigeminy timing includes premature ventricular beats and compensatory timing; VF remains disorganized without organized QRS complexes.

## Training logic

The adaptive trainer is CAT-inspired: it begins with easy questions, weights weaker categories more heavily, avoids immediate category repetition, adjusts estimated ability after each answer, and samples questions probabilistically. It is an educational adaptive algorithm, not the proprietary NCLEX psychometric CAT engine.

## Content inventory

- 114 vector rhythm strips.
- 114 rhythm-recognition training questions.
- 19 rhythm categories.
- 190 complete rhythm-focused clinical cases in the study trail (10 per rhythm category).
- Study lessons also include external references and YouTube links; external media are linked, not copied.

## Backend

Supabase remains optional. Demo mode works without it. Real authentication, persistent progress, admin workflows, and the AI tutor require a configured Supabase project and secrets.
