const fs = require('fs');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error(
    "❌ ERREUR : La clé GEMINI_API_KEY n'est pas configurée dans les Secrets GitHub !"
  );
  process.exit(1);
}

async function generateMatches() {
  const promptText = `Tu es une API JSON stricte spécialisée dans les matchs esport de Gentle Mates (M8).

À CHAQUE EXÉCUTION, effectue une recherche web en temps réel et récupère les données les plus récentes concernant TOUS les jeux esport dans lesquels Gentle Mates possède une équipe.

SOURCE PRINCIPALE :
https://bo3.gg/fr/valorant/teams/gentle-mates/matches

IMPORTANT :
- Ne te limite PAS à VALORANT.
- Recherche également les autres équipes et jeux de Gentle Mates présents sur BO3.gg ou dans des sources esport fiables.
- Détecte automatiquement les jeux disponibles.
- Pour chaque jeu, récupère :
  - les matchs récemment terminés ;
  - les matchs actuellement en cours ;
  - tous les prochains matchs annoncés.
- Les données doivent être actualisées à chaque exécution.
- Ne réutilise jamais des données d'une exécution précédente.
- N'invente aucune information.
- Si une donnée est inconnue, utilise "".

Pour chaque match, retourne exactement cette structure :

{
  "game": "Nom du jeu",
  "tournament": "Nom du tournoi",
  "date": "2026-08-12T18:00:00Z",
  "status": "finished",
  "team1": {
    "name": "Gentle Mates",
    "score": "2"
  },
  "team2": {
    "name": "Adversaire",
    "score": "1"
  }
}

STATUTS AUTORISÉS :
- "finished" = match terminé
- "running" = match actuellement en cours
- "upcoming" = match à venir

RÈGLES :
- Retourne les matchs de TOUS les jeux de Gentle Mates.
- Inclue les matchs récents des derniers jours.
- Inclue TOUS les prochains matchs connus.
- Pour les matchs terminés, utilise les scores réels.
- Pour les matchs à venir sans score, utilise "0" pour les deux équipes.
- Convertis toutes les dates en ISO 8601 UTC.
- Trie les résultats :
  1. matchs terminés les plus récents ;
  2. matchs en cours ;
  3. prochains matchs par date croissante.
- N'inclus pas les équipes féminines ou académiques sauf si elles sont explicitement identifiées comme l'équipe principale Gentle Mates.
- Vérifie les informations avec des sources récentes.
- Si plusieurs sources donnent des informations différentes, privilégie les informations les plus récentes et les sources esport les plus fiables.
- N'invente jamais un match, une date, un score ou un tournoi.

FORMAT FINAL OBLIGATOIRE :

[
  {
    "game": "Valorant",
    "tournament": "Nom du tournoi",
    "date": "2026-08-12T18:00:00Z",
    "status": "finished",
    "team1": {
      "name": "Gentle Mates",
      "score": "2"
    },
    "team2": {
      "name": "Adversaire",
      "score": "1"
    }
  }
]

CONTRAINTE ABSOLUE :
Retourne UNIQUEMENT le tableau JSON brut.

Aucun texte.
Aucun Markdown.
Aucun commentaire.
Aucune explication.
Aucun bloc \`\`\`json.

Si aucun match fiable n'est trouvé, retourne [].`;

  try {
    console.log("🔎 Recherche des matchs M8...");

    /*
     * Gemini Interactions API
     * Documentation officielle :
     * POST /v1beta/interactions
     */
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          input: promptText,
          tools: [
            {
              type: 'google_search'
            }
          ],
          generation_config: {
            thinking_level: 'low'
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();

      throw new Error(
        `Erreur API Gemini (${response.status}) : ${errText}`
      );
    }

    const data = await response.json();

    /*
     * L'Interactions API retourne plusieurs steps.
     * On récupère uniquement le model_output.
     */
    let rawResponse = '';

    if (Array.isArray(data.steps)) {
      for (const step of data.steps) {
        if (
          step.type === 'model_output' &&
          Array.isArray(step.content)
        ) {
          for (const content of step.content) {
            if (
              content.type === 'text' &&
              typeof content.text === 'string'
            ) {
              rawResponse += content.text;
            }
          }
        }
      }
    }

    /*
     * Sécurité supplémentaire si Gemini fournit directement output_text.
     */
    if (!rawResponse && typeof data.output_text === 'string') {
      rawResponse = data.output_text;
    }

    if (!rawResponse) {
      throw new Error(
        "Gemini n'a retourné aucun contenu exploitable."
      );
    }

    console.log("✅ Réponse Gemini reçue.");

    /*
     * Nettoyage du JSON.
     */
    let cleanJson = rawResponse
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    /*
     * Recherche du tableau JSON.
     */
    const firstBracket = cleanJson.indexOf('[');
    const lastBracket = cleanJson.lastIndexOf(']');

    if (firstBracket === -1 || lastBracket === -1) {
      throw new Error(
        "Impossible de trouver un tableau JSON dans la réponse Gemini."
      );
    }

    cleanJson = cleanJson.substring(
      firstBracket,
      lastBracket + 1
    );

    /*
     * Conversion JSON.
     */
    let parsedData;

    try {
      parsedData = JSON.parse(cleanJson);
    } catch (jsonError) {
      console.error("❌ Réponse Gemini reçue :");
      console.error(rawResponse);

      throw new Error(
        `JSON invalide retourné par Gemini : ${jsonError.message}`
      );
    }

    /*
     * Vérification principale.
     */
    if (!Array.isArray(parsedData)) {
      throw new Error(
        "La réponse Gemini n'est pas un tableau JSON."
      );
    }

    /*
     * Vérification des structures des matchs.
     * On ne détruit pas les données : on signale simplement
     * les éventuels éléments incorrects.
     */
    for (const match of parsedData) {
      if (
        typeof match !== 'object' ||
        match === null ||
        typeof match.game !== 'string' ||
        typeof match.tournament !== 'string' ||
        typeof match.date !== 'string' ||
        !['finished', 'running', 'upcoming'].includes(match.status) ||
        typeof match.team1 !== 'object' ||
        typeof match.team2 !== 'object'
      ) {
        throw new Error(
          "Un ou plusieurs matchs ont une structure JSON invalide."
        );
      }
    }

    /*
     * Écriture de matches.json
     */
    fs.writeFileSync(
      'matches.json',
      JSON.stringify(parsedData, null, 2),
      'utf8'
    );

    console.log(
      `✅ matches.json mis à jour avec succès : ${parsedData.length} match(s).`
    );

  } catch (error) {
    console.error(
      "❌ Erreur lors de la génération :",
      error.message
    );

    process.exit(1);
  }
}

generateMatches();