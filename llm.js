require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

/**
 * Send a prompt to Gemini and get a response
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function callLLM(prompt) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("[LLM] Gemini API call failed:", error.message);
    throw error;
  }
}

module.exports = { callLLM };
