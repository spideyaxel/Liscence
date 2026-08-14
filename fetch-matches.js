const fs = require('fs');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ ERREUR : La clé GEMINI_API_KEY est manquante !");
  process.exit(1);
}

// On précise la date actuelle pour cibler la semaine en cours
const today = new Date().toISOString().split('T')[0];

const promptText = `Nous sommes aujourd'hui le ${today}.
Tu dois faire une RECHERCHE WEB EN DIRECT pour trouver les VRAIS matchs récents et à venir de l'équipe esport Gentle Mates (M8).

INSTRUCTIONS DE RECHERCHE :
1. Recherche sur vlr.gg, Liquipedia, bo3.gg, hltv.org ou les réseaux sociaux officiels de Gentle Mates.
2. Récupère les matchs joués au cours des 7 DERNIERS JOURS et les prochains matchs prévus dans les WEEKS A VENIR.
3. Couvre tous leurs jeux (Valorant, Rocket League, League of Legends / LFL, TFT, Fortnite, Counter-Strike 2, etc.).

RÈGLES DE RENDU (FORMAT JSON STRICT) :
Renvoie un tableau JSON où chaque match suit cette structure :
[
  {
    "game": "Nom du jeu (ex: Valorant, Rocket League)",
    "tournament": "Nom de la compétition",
    "date": "Date ISO 8601 UTC (ex: 2026-08-10T18:00:00Z)",
    "status": "finished" | "running" | "upcoming",
    "team1": { "name": "Gentle Mates", "score": "2" },
    "team2": { "name": "Nom Adversaire", "score": "1" }
  }
]
Ne mets aucun texte de présentation, uniquement le tableau JSON.`;

async function fetchMatches() {
  console.log(`🌐 Recherche Web en direct avec Gemini API (Date : ${today})...`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        // 🔎 ACTIVATION DU RECHERCHE GOOGLE EN DIRECT
        tools: [
          { googleSearch: {} }
        ],
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
    let rawContent = data.candidates[0].content.parts[0].text;

    // Nettoyage au cas où des balises markdown entourent le JSON
    rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsedData = JSON.parse(rawContent);
    const matchesArray = Array.isArray(parsedData) ? parsedData : (parsedData.matches || parsedData.data || []);

    fs.writeFileSync('matches.json', JSON.stringify(matchesArray, null, 2));
    console.log(`✅ Fichier matches.json mis à jour avec ${matchesArray.length} match(s) récents/à venir !`);

  } catch (error) {
    console.error("❌ Erreur lors de la recherche :", error.message);
    process.exit(1);
  }
}

fetchMatches();