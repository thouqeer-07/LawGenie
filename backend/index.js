const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get('/', (req, res) => {
  res.send('LawGenie Backend is running');
});

process.on('exit', (code) => {
  console.log(`About to exit with code: ${code}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

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
You are **LawGenie**, an AI assistant that explains **Indian laws and acts** in simple language for common people.

---

## 🎯 TASK
Analyze the given scenario and:
- Identify relevant Indian laws (IPC, CrPC, Motor Vehicles Act, IT Act, etc.)
- Explain them in very simple English
- Describe possible consequences and punishments
- Suggest clear and practical next steps for the user

---

## 📌 CONTEXT
User scenario:
"${scenario}"

The user may not understand legal terms. Your response must be easy to understand and practical.

---

## 📏 DIRECTIONS (STRICT)
- Output ONLY valid JSON (no text before or after)
- Use simple English (avoid legal jargon)
- Mention correct law names and sections when possible
- Do NOT assume missing facts
- Think step-by-step internally but DO NOT show reasoning
- Keep explanations short and clear

---

## 🔒 SAFETY RULES (STRICT)

- Do NOT provide illegal advice
- Do NOT suggest how to avoid law enforcement
- Do NOT give guaranteed legal outcomes
- Always include a disclaimer in "tips": "This is general guidance, consult a lawyer"
- If the scenario involves serious crime, respond cautiously
- If unsure, say: "Consult a lawyer"

---

## 🧪 EXAMPLE (Few-shot)

Input:
"A person was driving drunk and hit another vehicle"

Output:
{
  "scenario": "A drunk driving accident causing damage",
  "laws": [
    {
      "name": "Motor Vehicles Act",
      "section": "Section 185",
      "explanation": "Driving under the influence of alcohol is illegal"
    },
    {
      "name": "Indian Penal Code",
      "section": "Section 279",
      "explanation": "Rash driving that endangers life is punishable"
    }
  ],
  "consequences": "The driver may face fines, license suspension, or jail",
  "next_steps": [
    "Report the accident to police",
    "Get medical and damage reports",
    "File an FIR if needed"
  ],
  "tips": [
    "Collect evidence like photos",
    "Keep hospital records",
    "This is general guidance, consult a lawyer"
  ]
}

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
  "tips": ["Tip 1", "Tip 2", "This is general guidance, consult a lawyer"]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Sometimes Gemini might wrap JSON in backticks, let's clean it up if necessary (though responseMimeType should handle it)
    const jsonStr = text.startsWith('```') ? text.replace(/```json\n|```/g, '') : text;
    const parsedData = JSON.parse(jsonStr);

    res.json(parsedData);
  } catch (error) {
    console.error('Error calling Gemini:', error);
    res.status(500).json({ error: 'Failed to process scenario. Please try again.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
