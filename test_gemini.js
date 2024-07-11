import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is not set in the environment variables.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function testGeminiAPI(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    console.log("Sending prompt to Gemini API...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("\nGemini API Response:");
    console.log(text);
  } catch (error) {
    console.error("Error testing Gemini API:", error.message);
  }
}

function askForPrompt() {
  rl.question("Enter your prompt (or type 'exit' to quit): ", (prompt) => {
    if (prompt.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    testGeminiAPI(prompt).then(() => {
      console.log("\n----------------------------\n");
      askForPrompt(); // Ask for another prompt after getting the response
    });
  });
}

console.log("Gemini API Tester");
console.log("----------------------------");
askForPrompt();

rl.on('close', () => {
  console.log("Goodbye!");
  process.exit(0);
});