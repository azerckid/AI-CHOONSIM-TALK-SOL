/**
 * Google Generative AI 모델 인스턴스 및 공유 유틸리티
 */
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import axios from "axios";
import { logger } from "../logger.server";

export const model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    model: "gemini-2.5-flash",
    maxOutputTokens: 2048,
    maxRetries: 3,
    verbose: process.env.NODE_ENV === "development",
    safetySettings: [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
    ],
});

/** 이미지 URL을 Base64 데이터 URL로 변환 */
export async function urlToBase64(url: string): Promise<string> {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const mimeType = response.headers["content-type"] || "image/jpeg";
        return `data:${mimeType};base64,${buffer.toString("base64")}`;
    } catch (e) {
        logger.error({ category: "SYSTEM", message: "Failed to convert image to base64 with axios:", stackTrace: (e as Error).stack });
        return url;
    }
}
