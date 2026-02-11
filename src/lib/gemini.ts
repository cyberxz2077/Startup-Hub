import { GoogleGenerativeAI } from '@google/generative-ai';

const getApiKey = () => {
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY;
};

export const getGeminiModel = () => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("Missing Gemini API Key. Please set NEXT_PUBLIC_GEMINI_API_KEY or API_KEY.");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
};

export const generateMatchScore = async (source: string, target: string, type: 'talent_to_project' | 'project_to_talent') => {
    const chat = getGeminiModel();

    const prompt = type === 'talent_to_project'
        ? `
      Analyze the compatibility between this Talent and this Project.
      
      Talent Profile:
      ${source}
      
      Project Manifest:
      ${target}
      
      Output JSON: { "score": number (0-100), "reason": "string (max 50 words summary)", "pros": ["string"], "cons": ["string"] }
      Assess based on: Skills match, Vision alignment, and Culture fit.
    `
        : `
      Analyze the compatibility between this Project and this Talent.
      
      Project Manifest:
      ${source}
      
      Talent Profile:
      ${target}
      
       Output JSON: { "score": number (0-100), "reason": "string (max 50 words summary)", "pros": ["string"], "cons": ["string"] }
    `;

    try {
        const result = await chat.generateContent(prompt);
        const text = result.response.text();
        if (!text) {
            console.error("Gemini Match Error: No text in response");
            return { score: 0, reason: "Analysis failed - No response", pros: [], cons: [] };
        }
        // Remove markdown code blocks if present
        const jsonStr = text.replace(/```json\n?|\n?```/g, '');
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Gemini Match Error:", error);
        return { score: 0, reason: "Analysis failed", pros: [], cons: [] };
    }
};
