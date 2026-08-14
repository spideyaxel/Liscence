const fs = require('fs');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("❌ ERREUR : La clé OPENAI_API_KEY est manquante dans les variables !");
  process.exit(1);
}

// 🎯 TON PROMPT RÉCUPÉRÉ ET OPTIMISÉ POUR LE JSON STRICT
const promptText = `Tu es une API JSON stricte spécialisée dans les matchs esport de Gentle Mates (M8).
À CHAQUE EXÉCUTION, effectue une recherche web en temps réel (ou utilise tes données les plus récentes) et récupère les données concernant TOUS les jeux esport dans lesquels Gentle Mates possède une équipe.
SOURCE PRINCIPALE : [https://bo3.gg/fr/valorant/teams/gentle-mates/matches](https://bo3.gg/fr/valorant/teams/gentle-mates/matches) et sources fiables.

IMPORTANT :
- Ne te limite PAS à VALORANT. Recherche également les autres équipes et jeux.
- Pour chaque jeu, récupère les matchs récemment terminés, en cours et tous les prochains matchs annoncés.
- Les données doivent être actualisées. Ne réutilise jamais des données précédentes.
- N'invente aucune information. Si une donnée est inconnue, utilise "0" pour le score.
- Convertis les dates en ISO 8601 UTC.
- Trie chronologiquement.

FORMAT ATTENDU POUR CHAQUE MATCH :
{
  "game": "Nom du jeu",
  "tournament": "Nom du tournoi",
  "date": "2026-08-12T18:00:00Z",
  "status": "finished",
  "team1": { "name": "Gentle Mates", "score": "2" },
  "team2": { "name": "Adversaire", "score": "1" }
}
STATUTS AUTORISÉS : "finished", "running", "upcoming".

CONTRAINTE ABSOLUE : Tu dois OBLIGATOIREMENT retourner un objet JSON contenant une seule clé "matches" avec ton tableau de résultats à l'intérieur. 
Exemple : { "matches": [ { ... }, { ... } ] }`;

async function fetchMatches() {
  console.log("🔄 Lancement de la récupération avec ton prompt (OpenAI GPT-4o)...");
  
  try {
    const response = await fetch("[https://api.openai.com/v1/chat/completions](https://api.openai.com/v1/chat/completions)", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" }, // 🪄 LA MAGIE : Bloque l'IA dans un format JSON parfait
        messages: [{ role: "user", content: promptText }]
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur API OpenAI (${response.status}) : ${await response.text()}`);
    }
    
    const data = await response.json();
    
    // On parse le résultat qui est garanti d'être du JSON propre
    const parsedData = JSON.parse(data.choices[0].message.content);
    
    // On extrait uniquement le tableau pour que ton fichier HTML (matchs.html) le lise correctement
    fs.writeFileSync('matches.json', JSON.stringify(parsedData.matches, null, 2));
    console.log(`✅ Fichier matches.json mis à jour et sauvegardé avec ${parsedData.matches.length} matchs !`);

  } catch (error) {
    console.error(`❌ Erreur critique lors de l'exécution : ${error.message}`);
    process.exit(1);
  }
}

fetchMatches();
