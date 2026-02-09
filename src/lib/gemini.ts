import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("Missing NEXT_PUBLIC_GEMINI_API_KEY");
}

const genAI = new GoogleGenAI({ apiKey });

export const getGeminiModel = () => {
    return genAI.chats.create({ model: "gemini-1.5-flash", config: { responseMimeType: "application/json" } });
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
        const result = await chat.sendMessage({ message: prompt });
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
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
