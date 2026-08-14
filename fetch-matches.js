const fs = require('fs');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ ERREUR : La clé GEMINI_API_KEY est manquante dans les variables d'environnement !");
  process.exit(1);
}

const promptText = `Tu es une API JSON stricte spécialisée dans les matchs esport de l'équipe Gentle Mates (M8).
Effectue une recherche et récupère les données les plus récentes concernant TOUS les jeux esport où Gentle Mates évolue (Valorant, Rocket League, League of Legends / LFL, TFT, Fortnite, etc.).

SOURCE D'INSPIRATION / RÉFÉRENCE :
- https://bo3.gg/fr/valorant/teams/gentle-mates/matches
- vlr.gg, Liquipedia, ou sites officiels esports.

RÈGLES STRICTES :
1. Récupère les matchs récemment terminés, en cours (live) et tous les prochains matchs programmés.
2. Pour chaque match, génère un objet au format suivant :
{
  "game": "Nom du jeu (ex: Valorant, Rocket League)",
  "tournament": "Nom de la compétition",
  "date": "Date au format ISO 8601 UTC (ex: 2026-08-15T18:00:00Z)",
  "status": "finished" | "running" | "upcoming",
  "team1": { "name": "Gentle Mates", "score": "2" },
  "team2": { "name": "Nom Adversaire", "score": "1" }
}
3. Si le score est inconnu (match à venir), mets "0".
4. Trie les résultats chronologiquement.
5. Renvoie un tableau JSON contenant tous les matchs.`;

async function fetchMatches() {
  console.log("🔄 Récupération des matchs Gentle Mates via Gemini API...");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erreur HTTP ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const rawContent = data.candidates[0].content.parts[0].text;
    const parsedData = JSON.parse(rawContent);

    const matchesArray = Array.isArray(parsedData) ? parsedData : (parsedData.matches || parsedData.data || []);

    fs.writeFileSync('matches.json', JSON.stringify(matchesArray, null, 2));
    console.log(`✅ Fichier matches.json mis à jour avec succès (${matchesArray.length} match(s) trouvés) !`);

  } catch (error) {
    console.error("❌ Erreur lors de l'exécution :", error.message);
    process.exit(1);
  }
}

fetchMatches();