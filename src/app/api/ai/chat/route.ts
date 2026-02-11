import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
    try {
        const { messages, systemInstruction, attachment } = await req.json();

        const apiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            console.error('SERVER ERROR: Gemini API Key missing in environment.');
            return NextResponse.json({ error: 'Gemini API Key missing on server' }, { status: 500 });
        }

        // Initialize SDK with string only to avoid version-specific object mismatches
        const genAI = new GoogleGenAI(apiKey);

        // Use any to bypass all runtime property checks while keeping functionality
        const model: any = (genAI as any).getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction
        });

        console.log(`[AI Chat] Processing ${messages.length} messages. Attachment: ${!!attachment}`);

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
        console.log('[AI Chat] Raw response received.');

        try {
            // Robust JSON cleaning
            const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
            return NextResponse.json(JSON.parse(cleanJson));
        } catch (parseError) {
            console.error('[AI Chat] JSON Parse Error:', parseError, 'Raw text:', responseText);
            return NextResponse.json({
                reply: "抱歉，我的思考模块产生了一些格式错误。不过我已经理解了你的意图，我们可以换种方式继续或者请你再说一遍。",
                updates: {}
            });
        }
    } catch (error: any) {
        console.error('[AI Chat] Route Error:', error);
        return NextResponse.json({
            error: "服务端请求 AI 失败",
            details: error.message
        }, { status: 500 });
    }
}
