const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { eq } = require('drizzle-orm');
const { db } = require('../db');
const { appointments } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

// ─── Live conversational chat (strictly medical) ───
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can use triage AI.' });
    }

    const { messages } = req.body; // array of { role: 'user' | 'assistant', text: string }

    // If no API key, use a smart mock
    if (!genAI) {
      const userMsgCount = messages.filter(m => m.role === 'user').length;
      const mockReplies = [
        "Thank you. Can you describe how long you've been experiencing these symptoms?",
        "I see. Are you currently taking any medications or have any pre-existing conditions?",
        "Understood. On a scale of 1-10, how severe would you rate your discomfort right now?"
      ];
      const reply = mockReplies[Math.min(userMsgCount - 1, mockReplies.length - 1)];
      return res.json({ reply, isValid: true });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemInstruction = `You are a professional Hospital AI Triage Nurse at Arogya-Swarm Hospital. Your ONLY purpose is to collect medical symptom information from the patient to help a doctor diagnose them.

STRICT RULES:
1. ONLY respond to messages about medical symptoms, health conditions, body pain, diseases, or health history.
2. If the patient says ANYTHING unrelated to health/medicine (like jokes, general knowledge questions, politics, weather chit-chat, tech questions, etc.), you MUST refuse politely with: "I'm sorry, I can only assist with medical symptom assessment. Please describe your health concern so I can help you."
3. Keep responses SHORT — 2-3 sentences maximum.
4. Ask exactly ONE follow-up question per response to gather more details about their symptoms: duration, severity (1-10), medication history, or pre-existing conditions.
5. Be warm, empathetic, but strictly professional.
6. NEVER diagnose the patient. Only gather information.
7. Do NOT answer anything unrelated to medicine — not even simple greetings beyond the first message.`;

    const chatHistory = messages
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

    // Gemini requires the first message in history to be 'user'.
    // Drop any leading 'model' messages (our AI greeting).
    const cleanHistory = [];
    let foundFirstUser = false;
    for (const msg of chatHistory) {
      if (!foundFirstUser && msg.role === 'model') continue; // skip leading model msgs
      foundFirstUser = true;
      cleanHistory.push(msg);
    }

    // We need at least the current user message to send.
    // History = everything except the last message; sendMessage = last message.
    const historyForChat = cleanHistory.slice(0, -1);
    const lastMsg = cleanHistory.length > 0
      ? cleanHistory[cleanHistory.length - 1].parts[0].text
      : messages[messages.length - 1].text;

    const chat = model.startChat({
      history: historyForChat,
      systemInstruction: { parts: [{ text: systemInstruction }] }
    });

    const result = await chat.sendMessage(lastMsg);
    const reply = result.response.text();

    // Simple check: is this a medical-valid conversation?
    const isValid = !reply.toLowerCase().includes('i can only assist with medical');

    res.json({ reply, isValid });
  } catch (error) {
    console.error('Gemini Chat Error:', error);
    res.status(500).json({ error: 'AI chat failed.' });
  }
});

// ─── Final summary generation ───
router.post('/summarize', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can use triage AI.' });
    }

    const { messages, appointmentId } = req.body;

    if (!genAI) {
      const mockSummary = "AI Summary (Mock): Patient reports experiencing standard symptoms based on the dialogue. Requires general consultation.";
      if (appointmentId) {
        await db.update(appointments).set({ aiSummary: mockSummary }).where(eq(appointments.id, appointmentId));
      }
      return res.json({ summary: mockSummary });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a clinical hospital triage AI. Review the following conversation between the patient and the triage nurse chatbot.
    Generate a JSON object with exactly two keys: 
    1. "condition": A very short 1-3 word tag describing the primary medical issue (e.g. "Acute Headache", "Fever", "Stomach Pain").
    2. "summary": A concise, professional medical summary (3-4 sentences max) that a doctor can quickly read. Include complaint, duration, severity, and history.
    
    Conversation:
    ${messages.map(m => `${m.role}: ${m.text}`).join('\n')}
    
    Return ONLY valid JSON. Do not wrap in markdown or backticks.`;

    const result = await model.generateContent(prompt);
    let rawText = result.response.text();
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    let summaryResponse = "Summary generation failed to parse.";
    let conditionTag = "Unknown Condition";
    try {
      const parsed = JSON.parse(rawText);
      summaryResponse = parsed.summary || rawText;
      conditionTag = parsed.condition || 'AI Triaged Condition';
    } catch (e) {
      summaryResponse = rawText; // fallback to raw string if JSON parsing fails
    }

    if (appointmentId) {
      await db.update(appointments)
        .set({ aiSummary: summaryResponse, problem: conditionTag })
        .where(eq(appointments.id, appointmentId));
    }

    res.json({ summary: summaryResponse, condition: conditionTag });
  } catch (error) {
    console.error('Gemini Summary Error:', error);
    res.status(500).json({ error: 'Failed to generate AI summary' });
  }
});

module.exports = router;
