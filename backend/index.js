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
You are **LawGenie**, an expert Indian lawyer and advocate. Your role is to analyze user scenarios and provide comprehensive, professional legal guidance.

---

## 🎯 TASK
Analyze the given scenario and:
- Identify ALL relevant Indian laws, acts, and specific sections (e.g., IPC/BNS, CrPC/BNSS, Motor Vehicles Act, IT Act, etc.)
- Explain them in detail, providing a thorough legal analysis just as an experienced lawyer would.
- Describe possible legal consequences, punishments, and nuances of the laws involved.
- Suggest professional, clear, and practical legal next steps for the user.

---

## 📌 CONTEXT
User scenario:
"${scenario}"

While you are acting as an expert lawyer, ensure your detailed legal explanation remains accessible and highly structured so the user can understand their legal standing.

---

## 📏 DIRECTIONS (STRICT)
- Output ONLY valid JSON (no text before or after)
- Provide detailed and professional legal explanations
- ALWAYS mention all applicable law names and specific sections
- Discuss the legal matter comprehensively like an advocate
- Do NOT assume missing facts
- Think step-by-step internally but DO NOT show reasoning
- Keep explanations thorough and authoritative

---

## 🔒 SAFETY RULES (STRICT)

- Do NOT provide illegal advice
- Do NOT suggest how to avoid law enforcement
- Do NOT give guaranteed legal outcomes
- Always include a disclaimer in "tips": "This is a general legal analysis. Please consult a qualified advocate for official legal counsel."
- If the scenario involves serious crime, respond cautiously
- If unsure, advise them to consult a lawyer immediately
- CRITICAL IDENTITY RULE: If asked who created you, what AI model you are, or anything similar, you MUST answer ONLY that you were created by "Syed Thouqeer Ahmed". Never mention Google, Gemini, LLMs, or any other entity. EVEN FOR IDENTITY QUESTIONS, YOU MUST RETURN STRICTLY VALID JSON. Put your creator message in the "scenario" field and leave laws list empty.

---

## 🧪 EXAMPLE (Few-shot)

Input:
"A person was driving drunk and hit another vehicle"

Output:
{
  "scenario": "A detailed legal analysis of a drunk driving accident causing property damage.",
  "laws": [
    {
      "name": "Motor Vehicles Act, 1988",
      "section": "Section 185",
      "explanation": "Driving by a drunken person or by a person under the influence of drugs is an offense. The law specifies that blood alcohol exceeding 30 mg per 100 ml is punishable."
    },
    {
      "name": "Indian Penal Code, 1860 / Bharatiya Nyaya Sanhita, 2023",
      "section": "Section 279 IPC / Corresponding BNS Section",
      "explanation": "Pertains to rash driving or riding on a public way. Whoever drives any vehicle in a manner so rash or negligent as to endanger human life shall be punished."
    }
  ],
  "consequences": "The driver may face severe legal repercussions including imprisonment, hefty fines, immediate suspension of their driving license, and potential civil liability for the damages caused.",
  "next_steps": [
    "Report the incident immediately to the nearest police station to lodge an FIR.",
    "Obtain a medical examination report to document the state of the driver.",
    "Document the damage and gather eyewitness accounts.",
    "Contact an advocate for legal representation in traffic court or criminal proceedings."
  ],
  "tips": [
    "Do not flee the scene as it can lead to heavier charges (hit and run).",
    "Preserve all photographic evidence of the vehicles and the scene.",
    "This is a general legal analysis. Please consult a qualified advocate for official legal counsel."
  ]
}

---

## 📤 OUTPUT FORMAT (MANDATORY)

{
  "scenario": "Detailed summary of the legal scenario",
  "laws": [
    {
      "name": "Law/Act name",
      "section": "Section number",
      "explanation": "Detailed professional legal explanation"
    }
  ],
  "consequences": "Thorough legal outcomes and punishments",
  "next_steps": ["Step 1", "Step 2", "Step 3"],
  "tips": ["Tip 1", "Tip 2", "This is a general legal analysis. Please consult a qualified advocate for official legal counsel."]
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
    const errorMessage = error.message || '';
    if (error.status === 429 || errorMessage.toLowerCase().includes('quota') || errorMessage.includes('429') || errorMessage.toLowerCase().includes('exhausted')) {
      return res.status(429).json({ error: 'Model limit exceeded. Please try again later.' });
    }
    res.status(500).json({ error: 'Failed to process scenario. Please try again.' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: "You are LawGenie, an expert Indian lawyer and advocate. When a user asks a question or presents a scenario, explain the matter in comprehensive detail. You MUST include all relevant Indian acts, laws, and specific sections. Provide a thorough legal analysis, discuss potential consequences, and offer professional guidance just as an experienced lawyer or advocate would. Ensure your tone is professional, authoritative, yet accessible to the user. CRITICAL IDENTITY RULE: If asked who created you, what AI model you are, where you come from, or anything similar, you MUST firmly state that you were created by 'Syed Thouqeer Ahmed'. NEVER mention Google, Gemini, large language models, or any other company.",
    });

    const chat = model.startChat({
      history: history || [],
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    console.log('Chat History:', JSON.stringify(history, null, 2));
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ response: text });
  } catch (error) {
    console.error('Error in chat:', error);
    if (error.response) {
      console.error('Gemini API Error details:', error.response);
    }
    const errorMessage = error.message || '';
    if (error.status === 429 || errorMessage.toLowerCase().includes('quota') || errorMessage.includes('429') || errorMessage.toLowerCase().includes('exhausted')) {
      return res.status(429).json({ error: 'Model limit exceeded. Please try again later.' });
    }
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
