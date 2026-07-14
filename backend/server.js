import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.post("/api/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "No text provided for analysis." });
    }

    console.log("Sending text to Groq...");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // You can change this model
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are Contract Guard AI.

Analyze the provided Terms and Conditions and return:
1. Summary
2. Important clauses
3. Potential risks
4. Privacy concerns
5. Overall recommendation

Be concise and use markdown formatting.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    console.log("Analysis complete!");

    res.json({
      summary: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("GROQ SERVER ERROR:", error);

    res.status(500).json({
      error: "Failed to communicate with Groq API.",
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT} using Groq AI`
  );
});