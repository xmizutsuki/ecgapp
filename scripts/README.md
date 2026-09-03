# Build scripts

- `generate_ecg_svgs.py`: deterministically generates the 114 educational Lead II ECG SVGs used by the app (19 rhythm categories × 6 variants).
- `patch_i18n.py`: makes the bilingual runtime boundary-safe during the GitHub Pages build so short Portuguese words cannot corrupt substrings inside English/Portuguese clinical terms.

GitHub Pages runs both scripts before validating and packaging the static site.
