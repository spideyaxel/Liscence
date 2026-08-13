const fs = require('fs');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ ERREUR : La clé GEMINI_API_KEY n'est pas configurée dans les Secrets GitHub !");
  process.exit(1);
}

async function generateMatches() {
  const promptText = `Tu es une API JSON stricte. 
Utilise ta recherche Google pour consulter la page https://bo3.gg/fr/valorant/teams/gentle-mates/matches. 
Extrais impérativement les matchs les plus récents de ces derniers jours (les résultats des matchs passés les plus proches d'aujourd'hui) ainsi que tous les prochains matchs à venir.
Renvoie UNIQUEMENT un tableau JSON valide respectant strictement ce format :
[{"game": "Valorant", "tournament": "Nom du tournoi", "date": "2026-08-12T18:00:00Z", "status": "finished", "team1": {"name": "Gentle Mates", "score": "2"}, "team2": {"name": "Adversaire", "score": "1"}}]
Règles pour le statut ("status") : mets "finished" pour les matchs passés, "upcoming" pour les matchs à venir, ou "running" si un match est en direct.
Ne mets aucun texte avant ou après, uniquement le JSON brut.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
    
    // Nettoyage intelligent pour extraire uniquement le tableau JSON
    let cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBracket = cleanJson.indexOf('[');
    const lastBracket = cleanJson.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1) {
      cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
    }

    const parsedData = JSON.parse(cleanJson);

    // Écriture du fichier matches.json
    fs.writeFileSync('matches.json', JSON.stringify(parsedData, null, 2));
    console.log("✅ Fichier matches.json mis à jour dynamiquement !");

  } catch (error) {
    console.error("❌ Erreur lors de la génération :", error.message);
    process.exit(1);
  }
}

generateMatches();
