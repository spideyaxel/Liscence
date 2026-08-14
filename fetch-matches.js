import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

// Initialisation avec la clé API transmise par GitHub Actions / Environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function fetchMatches() {
  try {
    console.log("🌐 Étape 1 : Recherche Web des matchs Gentle Mates (M8)...");

    // ÉTAPE 1 : Recherche d'informations avec l'outil Google Search (SANS responseMimeType)
    const searchResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Recherche les derniers résultats et les prochains matchs à venir de l'équipe Esport Gentle Mates (M8) sur Rocket League, Valorant et League of Legends.",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const rawSearchText = searchResponse.text;
    console.log("📊 Étape 2 : Structuration des données en JSON...");

    // ÉTAPE 2 : Extraction et mise en forme JSON strict (SANS outil)
    const jsonResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Extrais et structure tous les matchs Gentle Mates mentionnés ci-dessous dans un tableau JSON strict.

Données brutes à analyser :
${rawSearchText}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              game: { type: 'STRING', description: 'Nom du jeu (ex: Valorant, Rocket League, LoL)' },
              tournament: { type: 'STRING', description: 'Nom du tournoi ou de la ligue' },
              opponent: { type: 'STRING', description: 'Nom de l\'adversaire' },
              date: { type: 'STRING', description: 'Date et/ou heure du match' },
              status: { type: 'STRING', description: 'Terminé, En cours, ou À venir' },
              score: { type: 'STRING', description: 'Score final (ex: 2 - 1) ou "VS"' }
            },
            required: ['game', 'tournament', 'opponent', 'date', 'status', 'score']
          }
        }
      }
    });

    // Validation et écriture dans le fichier static matches.json
    const matchesData = JSON.parse(jsonResponse.text);
    fs.writeFileSync('matches.json', JSON.stringify(matchesData, null, 2), 'utf-8');

    console.log(`✅ Succès ! ${matchesData.length} matchs sauvegardés dans matches.json`);

  } catch (error) {
    console.error("❌ Erreur lors de l'exécution :", error);
    process.exit(1); // Échec explicite pour GitHub Actions
  }
}

fetchMatches();