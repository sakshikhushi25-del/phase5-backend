import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

dotenv.config();

const app = express();
const corsOptions = {
    origin: "https://phase5-frontend-bay.vercel.app",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}
app.use(cors(corsOptions));
app.use(express.json());

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function getGeminiAnswer(question) {
    const tries = 5
    for (let attempt = 1; attempt <= tries; attempt++) {
        try {
            console.log(`Trying Gemini... Attempt ${attempt}`);
            const response = await ai.models.generateContent({
                model: "gemini-3.7-flash",
                contents: question
            });
            if (response.text) {
                return response.text;
            }
            throw new Error("Gemini did not return an answer");
        } catch (error) {
            if (
                error.status !== 503 ||
                attempt === tries
            ) {
                throw error;
            }
            const waitTime = attempt * 6000;
            await delay(waitTime);
        }
    }
}

app.get("/", (req, res) => {
    res.status(200).send("Ask Gemini Application is running")
})

app.post("/ask", async (req, res) => {
    try {
        const { question } = req.body;
        if (
            !question ||
            typeof question !== "string" ||
            !question.trim()
        ) {
            return res.status(400).json({
                error: "Please enter a valid question."
            });
        }
        const answer = await getGeminiAnswer(question.trim());
        return res.status(200).json({answer});

    } catch (error) {
        console.error("Gemini error:", error.message);
        return res.status(
            error.status >= 400 && error.status < 600 ? error.status : 500
        ).json({
            error: "Unable to get an answer right now. Please try again."
        });
    }
});
export default app;

if(process.env.NODE_ENV == "production") {
    app.listen(3000, () => {
        console.log("Server is running");
    });
}