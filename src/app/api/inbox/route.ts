import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all chat sessions for the current user
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const chatSessions = await prisma.chatSession.findMany({
            where: {
                userId: session.id
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
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

// Send a message / Init a session
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

        // Find or create session
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

        // Add message
        const message = await prisma.chatMessage.create({
            data: {
                sessionId: chatSession.id,
                role: 'user',
                content: content
            }
        });

        // Update session timestamp
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
