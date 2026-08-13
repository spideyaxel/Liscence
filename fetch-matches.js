// fetch-matches.js
const fs = require('fs');

// La clé API sera sécurisée dans les paramètres GitHub
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

async function generateMatches() {
  const promptText = `Tu es une API de données esports. Recherche sur le Web les résultats des matchs joués au cours des 7 derniers jours et les prochains matchs programmés pour l'équipe "Gentle Mates" (M8) pour tous les jeux. Ne cherche aucune image.
Renvoie STRICTEMENT un tableau JSON valide.
Format: [{"game": "Jeu", "tournament": "Tournoi", "date": "2026-08-10T18:00:00Z", "status": "finished", "team1": {"name": "Gentle Mates", "score": "2"}, "team2": {"name": "Adversaire", "score": "1"}}]`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        tools: [{ googleSearch: {} }]
      })
    });

    if (!response.ok) throw new Error("Erreur avec l'API Gemini");

    const data = await response.json();
    const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // On vérifie que c'est bien du JSON valide avant de sauvegarder
    JSON.parse(cleanJson);

    // On écrit le résultat dans le fichier matches.json
    fs.writeFileSync('matches.json', cleanJson);
    console.log("Fichier matches.json mis à jour avec succès !");

  } catch (error) {
    console.error("Erreur lors de la génération :", error);
    process.exit(1); // Fait échouer l'action GitHub si ça rate
  }
}

generateMatches();
