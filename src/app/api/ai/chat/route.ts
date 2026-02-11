import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
    try {
        const { messages, systemInstruction, attachment } = await req.json();

        // 优先使用 Vercel 环境变量，本地使用 .env
        const apiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
            console.error('[AI Proxy] Server Error: Gemini API Key missing.');
            return NextResponse.json({ error: 'Gemini API Key missing on server' }, { status: 500 });
        }

        console.log(`[AI Proxy] Initializing GoogleGenerativeAI with key prefix: ${apiKey.substring(0, 5)}...`);

        // 使用标准 SDK 初始化
        const genAI = new GoogleGenerativeAI(apiKey);

        // 获取模型实例，并传入系统指令（如果SDK支持）
        // 注意：标准 SDK 在 getGenerativeModel 中支持 systemInstruction
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction
        });

        console.log(`[AI Proxy] Processing ${messages.length} messages. Has Attachment: ${!!attachment}`);

        // 转换消息历史格式为 SDK 所需格式
        // SDK 格式: { role: 'user' | 'model', parts: [{ text: string }] }
        // 前端格式: { role: 'user' | 'model', text: string }
        const history = messages.slice(0, -1).map((msg: any) => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        const chat = model.startChat({
            history: history,
            generationConfig: {
                // 确保模型输出 JSON，以便前端解析
                responseMimeType: 'application/json',
            },
        });

        const currentMsg = messages[messages.length - 1];
        let content: any = currentMsg.text;

        // 处理附件
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
            // 清理可能存在的 Markdown 代码块标记
            const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
            return NextResponse.json(JSON.parse(cleanJson));
        } catch (parseError) {
            console.error('[AI Proxy] JSON Parse Error:', parseError);
            console.error('[AI Proxy] Raw Response:', responseText);

            // 返回一个友好的错误提示，而不是 500
            return NextResponse.json({
                reply: "抱歉，由于模型输出格式异常，我暂时无法处理。请稍后再试或换个说法。",
                updates: {}
            });
        }
    } catch (error: any) {
        console.error('[AI Proxy] Critical Error:', error);
        return NextResponse.json({
            error: "AI 服务暂时不可用",
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
