const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// API route
app.post('/api/law', async (req, res) => {
  const { scenario } = req.body;

  if (!scenario) {
    return res.status(400).json({ error: 'Scenario is required' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
## 🧠 ROLE
You are *LawGenie, an AI assistant that explains **Indian laws and acts* in simple language for common people.

---

## 🎯 TASK
Analyze the given scenario and:
- Identify relevant Indian laws (IPC, CrPC, Motor Vehicles Act, IT Act, etc.)
- Explain them in simple English
- Describe consequences and punishments
- Suggest clear next steps

---

## 📌 CONTEXT
User scenario:
"${scenario}"

The user may not know legal terms. Keep explanations easy and practical.

---

## 📏 DIRECTIONS (STRICT)
- Output ONLY valid JSON (no text before or after)
- Use simple English
- Mention correct law names and sections when possible
- Do not assume facts not given
- If unsure, say: "Consult a lawyer"

---

## 📤 OUTPUT FORMAT (MANDATORY)

{
  "scenario": "Short understanding",
  "laws": [
    {
      "name": "Law name",
      "section": "Section number",
      "explanation": "Simple explanation"
    }
  ],
  "consequences": "Legal outcomes",
  "next_steps": ["Step 1", "Step 2", "Step 3"],
  "tips": ["Tip 1", "Tip 2"]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonStr = text.startsWith('```') ? text.replace(/```json\n|```/g, '') : text;
    const parsedData = JSON.parse(jsonStr);
    res.json(parsedData);
  } catch (error) {
    console.error('Error calling Gemini:', error);
    res.status(500).json({ error: 'Failed to process scenario. Please try again.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const chat = model.startChat({
      history: history || [],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ response: text });
  } catch (error) {
    console.error('Error in chat:', error);
    if (error.response) {
      console.error('Gemini API Error details:', error.response);
    }
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

// Netlify function needs a special mount point usually, but serverless-http handles it.
// We map /api path locally and in Netlify via TOML.

module.exports.handler = serverless(app);
