const fs = require('fs');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
  console.error("❌ ERREUR : Aucune clé API (Gemini ou OpenAI) n'est configurée !");
  process.exit(1);
}

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
  "team1": { "name": "Gentle Mates", "score": "2" },
  "team2": { "name": "Adversaire", "score": "1" }
}
STATUTS AUTORISÉS : "finished", "running", "upcoming".
RÈGLES :
- Retourne les matchs de TOUS les jeux de Gentle Mates.
- Inclue les matchs récents et TOUS les prochains matchs.
- Convertis les dates en ISO 8601 UTC.
- Trie les résultats chronologiquement.
FORMAT FINAL OBLIGATOIRE : [ { ... } ]
CONTRAINTE ABSOLUE : Retourne UNIQUEMENT le tableau JSON brut. Aucun texte, aucun bloc \`\`\`json.`;

// 🔹 FONCTION 1 : Appel à Google Gemini
async function fetchWithGemini() {
  console.log("🔄 Tentative de récupération avec Google Gemini...");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      tools: [{ googleSearch: {} }]
    })
  });

  if (!response.ok) throw new Error(`Erreur Gemini (${response.status})`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
}

// 🔹 FONCTION 2 : Appel à OpenAI (Solution de secours)
async function fetchWithOpenAI() {
  console.log("🔄 Gemini a échoué. Prise de relais par OpenAI (GPT-4o)...");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o", // Le modèle le plus performant pour le web
      messages: [{ role: "user", content: promptText }]
    })
  });

  if (!response.ok) throw new Error(`Erreur OpenAI (${response.status})`);
  const data = await response.json();
  return data.choices[0].message.content || "[]";
}

// 🔹 LOGIC PRINCIPALE
async function generateMatches() {
  let rawResponse = "";

  try {
    if (GEMINI_API_KEY) {
      rawResponse = await fetchWithGemini();
      console.log("✅ Données récupérées avec succès via Gemini !");
    } else {
      throw new Error("Clé Gemini introuvable.");
    }
  } catch (geminiError) {
    console.warn(`⚠️ Problème avec Gemini : ${geminiError.message}`);
    
    try {
      if (OPENAI_API_KEY) {
        rawResponse = await fetchWithOpenAI();
        console.log("✅ Données récupérées avec succès via OpenAI !");
      } else {
        throw new Error("Clé OpenAI introuvable. Impossible d'utiliser le relais.");
      }
    } catch (openAiError) {
      console.error(`❌ OpenAI a également échoué : ${openAiError.message}`);
      process.exit(1);
    }
  }

  // Nettoyage du JSON
  let cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
  const firstBracket = cleanJson.indexOf('[');
  const lastBracket = cleanJson.lastIndexOf(']');
  
  if (firstBracket !== -1 && lastBracket !== -1) {
    cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
  }

  // Sauvegarde
  try {
    const parsedData = JSON.parse(cleanJson);
    fs.writeFileSync('matches.json', JSON.stringify(parsedData, null, 2));
    console.log("📁 Fichier matches.json enregistré !");
  } catch (error) {
    console.error("❌ Erreur de lecture du JSON généré :", error.message);
    process.exit(1);
  }
}

generateMatches();
