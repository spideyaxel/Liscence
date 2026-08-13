const fs = require('fs');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ ERREUR : La clé GEMINI_API_KEY n'est pas configurée dans les Secrets GitHub !");
  process.exit(1);
}

async function generateMatches() {
  const promptText = `Tu es une API JSON stricte spécialisée dans les matchs esport de Gentle Mates (M8).
À CHAQUE EXÉCUTION, effectue une recherche web en temps réel et récupère les données les plus récentes concernant TOUS les jeux esport dans lesquels Gentle Mates possède une équipe.
SOURCE PRINCIPALE :
https://bo3.gg/fr/valorant/teams/gentle-mates/matches
IMPORTANT :
- Ne te limite PAS à VALORANT.
- Recherche également les autres équipes et jeux de Gentle Mates présents sur BO3.gg ou dans les sources esport fiables.
- Détecte automatiquement les jeux disponibles.
- Pour chaque jeu, récupère les matchs récemment terminés, les matchs en cours et tous les prochains matchs annoncés.
- Les données doivent être actualisées à chaque exécution.
- Ne réutilise jamais des données d'une exécution précédente.
- N'invente aucune information.
- Si une donnée est inconnue, utilise "".
Pour chaque match, retourne exactement :
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
- Convertis les dates en ISO 8601 UTC.
- Trie les résultats chronologiquement : récents terminés → en cours → prochains matchs.
- N'inclus pas les équipes féminines ou académiques sauf si elles sont explicitement identifiées comme l'équipe principale Gentle Mates.
- Vérifie les informations avec une source récente avant de les retourner.
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
Si aucun match n'est trouvé, retourne [].`;

  try {
    // Utilisation de gemini-2.0-flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        tools: [{ googleSearch: {} }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erreur API Gemini (${response.status}) : ${errText}`);
    }

    const data = await response.json();
    const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    
    // Nettoyage de sécurité
    let cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBracket = cleanJson.indexOf('[');
    const lastBracket = cleanJson.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1) {
      cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
    }

    const parsedData = JSON.parse(cleanJson);

    // Écriture du fichier matches.json
    fs.writeFileSync('matches.json', JSON.stringify(parsedData, null, 2));
    console.log("✅ Fichier matches.json mis à jour avec succès !");

  } catch (error) {
    console.error("❌ Erreur lors de la génération :", error.message);
    process.exit(1);
  }
}

generateMatches();
