import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
    try {
        const { messages, systemInstruction, attachment } = await req.json();

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API Key missing on server' }, { status: 500 });
        }

        const genAI = new GoogleGenAI({ apiKey });
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: systemInstruction
        });

        // Prepare history for chat - convert to Gemini format
        const history = messages.slice(0, -1).map((msg: any) => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        const chat = model.startChat({
            history: history,
            generationConfig: {
                responseMimeType: 'application/json',
            },
        });

        const currentMsg = messages[messages.length - 1];
        let content: any = currentMsg.text;

        if (attachment) {
            content = [
                { text: currentMsg.text || "Please analyze this attachment." },
                {
                    inlineData: {
                        mimeType: attachment.mimeType,
                        data: attachment.data,
                    },
                },
            ];
        }

        const result = await chat.sendMessage(content);
        const responseText = result.response.text();

        return NextResponse.json(JSON.parse(responseText));
    } catch (error: any) {
        console.error('AI Chat Route Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
