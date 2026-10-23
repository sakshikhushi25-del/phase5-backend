
import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

dotenv.config();

const app = express();

// CORS configuration
const allowedOrigins = [
    "https://phase5-frontend-peach.vercel.app",
    "http://127.0.0.1:5500",
    "http://localhost:5500"
];

const corsOptions = {
    origin: allowedOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

// Explicitly handle preflight requests for /ask
app.options("/ask", cors(corsOptions));

app.use(express.json());

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getGeminiAnswer(question) {
    const tries = 5;

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
            if (error.status !== 503 || attempt === tries) {
                throw error;
            }

            const waitTime = attempt * 6000;
            await delay(waitTime);
        }
    }
}

app.get("/", (req, res) => {
    res.status(200).send("Ask Gemini Application is running");
});

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

        return res.status(200).json({ answer });

    } catch (error) {
        console.error("Gemini error:", error.message);

        return res.status(
            error.status >= 400 && error.status < 600
                ? error.status
                : 500
        ).json({
            error: "Unable to get an answer right now. Please try again."
        });
    }
});

export default app;

// Start the server locally, not in Vercel production
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
