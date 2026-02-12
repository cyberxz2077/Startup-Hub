import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

interface RequestBody {
    messages: ChatMessage[];
    systemInstruction: string;
    attachment?: {
        name: string;
        data: string;
        mimeType: string;
    };
}

export async function POST(req: NextRequest) {
    try {
        const { messages, systemInstruction, attachment } = await req.json() as RequestBody;

        const apiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
            console.error('[AI Proxy] Server Error: Gemini API Key missing.');
            return NextResponse.json({ error: 'Gemini API Key missing on server' }, { status: 500 });
        }

        console.log(`[AI Proxy] Initializing GoogleGenerativeAI with key prefix: ${apiKey.substring(0, 5)}...`);

        const genAI = new GoogleGenerativeAI(apiKey);

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: systemInstruction
        });

        console.log(`[AI Proxy] Processing ${messages.length} messages. Has Attachment: ${!!attachment}`);

        const allButLast = messages.slice(0, -1);
        
        let history = allButLast
            .map((msg: ChatMessage) => ({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            }))
            .filter((_, index, arr) => {
                if (index === 0 && arr[0].role === 'model') {
                    return false;
                }
                return true;
            });

        if (history.length > 0 && history[history.length - 1].role === 'model') {
            const lastModel = history.pop();
            if (lastModel) {
                history.push({
                    role: 'user',
                    parts: [{ text: '(继续之前的对话)' }]
                });
                history.push(lastModel);
            }
        }

        console.log('[AI Proxy] History length:', history.length);

        const chat = model.startChat({
            history: history,
            generationConfig: {
                responseMimeType: 'application/json',
            },
        });

        const currentMsg = messages[messages.length - 1];
        let content: string | (string | Part)[] = currentMsg.text;

        if (attachment) {
            content = [
                { text: currentMsg.text || "Please analyze this attachment based on the context." },
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
        console.log('[AI Proxy] Response received. Length:', responseText.length);

        try {
            const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
            return NextResponse.json(JSON.parse(cleanJson));
        } catch (parseError) {
            console.error('[AI Proxy] JSON Parse Error:', parseError);
            console.error('[AI Proxy] Raw Response:', responseText);

            return NextResponse.json({
                reply: "抱歉，由于模型输出格式异常，我暂时无法处理。请稍后再试或换个说法。",
                updates: {}
            });
        }
    } catch (error: unknown) {
        console.error('[AI Proxy] Critical Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        return NextResponse.json({
            error: "AI 服务暂时不可用",
            details: errorMessage,
            stack: errorStack
        }, { status: 500 });
    }
}
