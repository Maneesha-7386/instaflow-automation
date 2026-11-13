/**
 * Backend AI Service (Google Gemini REST API)
 * Runs securely server-side using GEMINI_API_KEY from functions/.env.
 */
const { envConfig } = require('../config/env');

function assertGeminiKey() {
  const key = envConfig.ai.geminiApiKey;
  if (!key || key.startsWith('YOUR_')) {
    const err = new Error(
      'GEMINI_API_KEY is not configured in functions/.env. Add a valid key to enable live Gemini AI generation.'
    );
    err.statusCode = 503;
    err.code = 'AI_KEY_MISSING';
    throw err;
  }
  return key;
}

async function callGeminiJson(prompt) {
  const apiKey = assertGeminiKey();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Gemini API HTTP ${res.status}`);
    err.statusCode = res.status;
    throw err;
  }

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(rawText);
}

async function generateStudioContent({ tool = 'ai_reel', topic, style, duration, language, brandHandle }) {
  if (tool === 'thumbnail') {
    return callGeminiJson(
      `Return JSON with fields {"headline": string, "subtitle": string, "caption": string, "hashtags": string[]}. Create a high-CTR Instagram Reel thumbnail cover concept in ${language || 'English'} for ${brandHandle || 'an Instagram creator'} in "${style}" style about: "${topic}". Keep headline under 7 words.`
    );
  }

  if (tool === 'post') {
    return callGeminiJson(
      `Return JSON with fields {"headline": string, "subtitle": string, "caption": string, "hashtags": string[]}. Create an Instagram feed post design headline and engaging caption with 5 relevant hashtags in ${language || 'English'} for ${brandHandle || 'an Instagram brand'} in "${style}" style about: "${topic}".`
    );
  }

  return callGeminiJson(
    `Return JSON with fields {"title": string, "scenes": [{"num": number, "hook": string, "text": string}], "caption": string, "audioNotes": string}. Create a 3-scene Instagram Reel script (${duration || '15 sec'}, "${style}" style, language ${language || 'English'}) for ${brandHandle || 'a creator'} about: "${topic}". Include hashtags inside caption.`
  );
}

async function chatWithAssistant({ message, workspaceSummary = {} }) {
  const apiKey = assertGeminiKey();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const systemPrompt = `You are InstaFlow AI, an Instagram growth, Reels scripting, Meta API compliance, and automation assistant. User workspace summary: ${JSON.stringify(
    workspaceSummary
  )}. Give concise, practical answers.`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser question: ${message}` }] },
      ],
      generationConfig: { temperature: 0.6 },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Gemini API HTTP ${res.status}`);
    err.statusCode = res.status;
    throw err;
  }

  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response returned by Gemini.';
  return { reply };
}

module.exports = {
  generateStudioContent,
  chatWithAssistant,
};

