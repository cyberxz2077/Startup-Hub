import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_MESSAGES = [
    {
        targetName: "AI Health Assistant",
        targetType: "project",
        messages: [
            { role: "assistant", content: "Hi! I noticed you're interested in the AI Health Assistant project. We're currently looking for a ML Engineer to join our team. Would you like to learn more about the role?" },
            { role: "user", content: "Yes, I'd love to hear more! What's the tech stack you're using?" },
            { role: "assistant", content: "Great! We're using PyTorch for our ML models, FastAPI for the backend, and React Native for mobile. The role involves improving our health prediction models and working with our medical data team." }
        ]
    },
    {
        targetName: "GreenChain",
        targetType: "project",
        messages: [
            { role: "assistant", content: "Welcome! I'm the founder of GreenChain. I see you have experience in blockchain development. We're building a carbon credit marketplace and would love to discuss potential collaboration." },
            { role: "user", content: "That sounds interesting! What blockchain are you building on?" },
            { role: "assistant", content: "We're on Ethereum with plans to expand to Polygon for lower gas fees. Our smart contracts handle carbon credit verification and trading. Would you be interested in a technical discussion?" }
        ]
    },
    {
        targetName: "TechVentures Capital",
        targetType: "service",
        messages: [
            { role: "assistant", content: "Hello! I'm a partner at TechVentures Capital. We focus on early-stage AI and SaaS investments. I'd be happy to learn more about your startup journey." },
            { role: "user", content: "Thanks for reaching out! We're building an AI-powered skill assessment platform. Currently at pre-seed stage." },
            { role: "assistant", content: "That's an exciting space! We've seen a lot of activity in EdTech. Could you share more about your traction and what makes your approach unique?" }
        ]
    }
];

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json([]);
        }

        const count = await prisma.chatSession.count({
            where: { userId: session.id }
        });

        if (count === 0) {
            for (const testChat of TEST_MESSAGES) {
                const chatSession = await prisma.chatSession.create({
                    data: {
                        userId: session.id,
                        targetId: `test_${testChat.targetName.toLowerCase().replace(/\s+/g, '_')}`,
                        targetType: testChat.targetType
                    }
                });

                for (const msg of testChat.messages) {
                    await prisma.chatMessage.create({
                        data: {
                            sessionId: chatSession.id,
                            role: msg.role as 'user' | 'assistant',
                            content: msg.content
                        }
                    });
                }
            }
        }

        const chatSessions = await prisma.chatSession.findMany({
            where: {
                userId: session.id
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json(chatSessions);

    } catch (error) {
        console.error('Failed to fetch inbox:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { targetId, targetType, content } = await request.json();

        if (!targetId || !targetType || !content) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        let chatSession = await prisma.chatSession.findFirst({
            where: {
                userId: session.id,
                targetId: targetId,
                targetType: targetType
            }
        });

        if (!chatSession) {
            chatSession = await prisma.chatSession.create({
                data: {
                    userId: session.id,
                    targetId: targetId,
                    targetType: targetType
                }
            });
        }

        const message = await prisma.chatMessage.create({
            data: {
                sessionId: chatSession.id,
                role: 'user',
                content: content
            }
        });

        await prisma.chatSession.update({
            where: { id: chatSession.id },
            data: { updatedAt: new Date() }
        });

        return NextResponse.json({ success: true, message });

    } catch (error) {
        console.error('Failed to send message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
