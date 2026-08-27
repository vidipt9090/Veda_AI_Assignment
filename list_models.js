const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
const apiKey = env.split("GEMINI_API_KEY=")[1].trim();

const ai = new GoogleGenAI({ apiKey: apiKey });

async function listModels() {
  try {
    const response = await ai.models.list();
    for await (const model of response) {
      console.log(model.name);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
