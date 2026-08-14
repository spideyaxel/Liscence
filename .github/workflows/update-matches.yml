name: Actualisation des Matchs M8

on:
  schedule:
    - cron: '0 */6 * * *' # S'exécute toutes les 6 heures
  workflow_dispatch: # Permet de lancer le script à la main

jobs:
  update-data:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Récupérer le code du dépôt
        uses: actions/checkout@v4

      - name: Configuration de Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Exécuter le script avec OpenAI
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: node fetch-matches.js

      - name: Commiter et pousser les changements
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          git add matches.json
          git diff --quiet && git diff --staged --quiet || (git commit -m "bot: mise à jour des matchs M8" && git push)
