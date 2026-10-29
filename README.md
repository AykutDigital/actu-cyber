# Veille Cyber

Actualités cybersécurité du monde entier, analysées par Claude (comment, pourquoi, réponse des experts, délai) et traduites en français, anglais, turc, arabe et russe.

- Site public : https://aykutdigital.github.io/actu-cyber/
- Automatisation : `.github/workflows/update.yml` toutes les 3 h → `scripts/update.ts`
- App Android : `npm run apk` (lit les données du site)

Secrets GitHub requis : `ANTHROPIC_API_KEY`, `ANTHROPIC_WORKSPACE_ID` (si la clé n'est pas rattachée à un workspace).
Variable optionnelle : `MAX_ANALYSES` (nouvelles analyses max par passage, 15 par défaut).
