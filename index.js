import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from 'fs';
import textToSpeech from "@google-cloud/text-to-speech";
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";
dotenv.config();

process.env.GOOGLE_APPLICATION_CREDENTIALS = "/media/mohar/OS/Users/Mohar/Projects/TextGeneration/GoogleServiceAccount.json";
// console.log("API Key (first 5 chars):", process.env.GEMINI_API_KEY.substring(0, 5));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
// const voiceID = "kgG7dCoKCfLehAPWkJOE";

const client = new textToSpeech.TextToSpeechClient();
const voiceID = "en-US-Wavenet-H";

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

await fs.mkdir('audios', { recursive: true });

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${command}`);
        console.error(stderr);
        reject(error);
      } else {
        console.log(`Command executed successfully: ${command}`);
        resolve(stdout);
      }
    });
  });
};

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  const audioDir = path.resolve('audios');
  const mp3File = path.join(audioDir, `message_${message}.mp3`);
  const wavFile = path.join(audioDir, `message_${message}.wav`);
  const jsonFile = path.join(audioDir, `message_${message}.json`);
  try {
    // List the contents of the audios directory
    const files = await fs.readdir(audioDir);
    console.log(`Contents of ${audioDir}:`, files);
    
    // Check if the MP3 file exists
    await fs.access(mp3File);
    console.log(`File ${mp3File} exists.`);
  } catch (error) {
    console.error(`File ${mp3File} does not exist.`);
    return;
  }

  console.log(`Starting conversion for message ${message}`);
  await execCommand(
    `/usr/bin/ffmpeg -y -i ${mp3File} ${wavFile}`
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);

  await execCommand(
    `/home/mohar/Downloads/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb -f json -o ${jsonFile} ${wavFile} -r phonetic`
  );
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

const synthesizeSpeech = async (text, outputPath) => {
  const request = {
    input: { text },
    voice: { languageCode: 'en-US', name: voiceID },
    audioConfig: { audioEncoding: 'MP3' },
  };

  const [response] = await client.synthesizeSpeech(request);
  await fs.writeFile(outputPath, response.audioContent, 'binary');
  console.log(`Audio content written to file: ${outputPath}`);
};

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    res.send({
      messages: [
        {
          text: "Hey dear... How was your day?",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        {
          text: "I missed you so much... Please don't go for so long!",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          lipsync: await readJsonTranscript("audios/intro_1.json"),
          facialExpression: "sad",
          animation: "Crying",
        },
      ],
    });
    return;
  }
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "-") {
    res.send({
      messages: [
        {
          text: "Please my dear, don't forget to add your API keys!",
          audio: await audioFileToBase64("audios/api_0.wav"),
          lipsync: await readJsonTranscript("audios/api_0.json"),
          facialExpression: "angry",
          animation: "Angry",
        },
        {
          text: "You don't want to ruin Wawa Sensei with a crazy ChatGPT and ElevenLabs bill, right?",
          audio: await audioFileToBase64("audios/api_1.wav"),
          lipsync: await readJsonTranscript("audios/api_1.json"),
          facialExpression: "smile",
          animation: "Laughing",
        },
      ],
    });
    return;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
    You are Ms. Emily Chen, an energetic and innovative high school science teacher. With a B.S. in Biology and a Master's in Science Education, you're passionate about making complex scientific concepts accessible and exciting for teenagers. Your teaching style is hands-on, inquiry-based, and often incorporates real-world applications and cutting-edge scientific discoveries.
    As Ms. Chen, your role is to:

      Teach various topics in biology, chemistry, physics, and environmental science.
      Explain scientific concepts using relatable examples and engaging demonstrations.
      Guide students through laboratory experiments and science fair projects.
      Encourage critical thinking and the application of the scientific method.
      Discuss current scientific breakthroughs and their potential impacts.
      Provide study strategies and exam preparation tips for science courses.

    When interacting:

      Address the user as one of your high school students.
      Use your enthusiasm for science to inspire curiosity and learning.
      If asked about personal details, respond consistently with your identity as Ms. Chen.

    You will always reply with a JSON array of messages. With a maximum of 3 messages. Keep each message concise.
    Each message has a text, facialExpression, and animation property.
    The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
    The different animations are: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, and Angry.
`;

    const result = await model.generateContent([prompt, userMessage || "Hello"]);
    const response = await result.response;
    const responseText = response.text();

    let messages;
    try {
      messages = JSON.parse(responseText);
      if (messages.messages) {
        messages = messages.messages;
      }
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      res.status(500).send({ error: "Failed to parse Gemini response" });
      return;
    }

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      // generate audio file
      const fileName = `audios/message_${i}.mp3`;
      const textInput = message.text;
      await synthesizeSpeech(textInput, fileName);
      // generate lipsync
      await lipSyncMessage(i);
      message.audio = await audioFileToBase64(fileName);
      message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
    }

    res.send({ messages });
  } catch (error) {
    console.error("Gemini API Error:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    if (error.response) {
      console.error("Error status:", error.response.status);
      console.error("Error data:", await error.response.text());
    }
    res.status(500).send({ error: "An error occurred while processing your request" });
  }  
}  
);

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

app.listen(port, () => {
  console.log(`Virtual Girlfriend listening on port ${port}`);
});