import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
    try {
        const { messages, systemInstruction, attachment } = await req.json();

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API Key missing on server' }, { status: 500 });
        }

        const genAI = new GoogleGenAI(apiKey);
        // Using any to bypass local environment type mismatches
        const model = (genAI as any).getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction
        });

        console.log(`Processing AI chat request: ${messages.length} messages, attachment: ${!!attachment}`);

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
        console.log('Gemini raw response:', responseText);

        try {
            // Clean markdown if AI wrapped it
            const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
            return NextResponse.json(JSON.parse(cleanJson));
        } catch (parseError) {
            console.error('JSON Parse Error from Gemini:', parseError, 'Raw text:', responseText);
            return NextResponse.json({
                reply: "抱歉，我的思考模块产生了一些格式错误。不过我已经理解了你的意图，我们可以换种方式继续或者请你再说一遍。",
                updates: {}
            });
        }
    } catch (error: any) {
        console.error('AI Chat Route Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
