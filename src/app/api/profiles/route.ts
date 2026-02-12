import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ 
                name: null,
                avatar: null,
                bio: null,
                title: "",
                location: "",
                skills: [],
                experienceHighlights: "",
                education: "",
                lookingFor: "",
                superpower: "",
                others: {},
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.id },
            include: { profile: true }
        });

        if (!user) {
            return NextResponse.json({ 
                name: null,
                avatar: null,
                bio: null,
                title: "",
                location: "",
                skills: [],
                experienceHighlights: "",
                education: "",
                lookingFor: "",
                superpower: "",
                others: {},
            });
        }

        const profileData = {
            name: user.name || "",
            avatar: user.avatar || undefined,
            bio: "",

            title: user.profile?.title || "",
            location: user.profile?.location || "",
            skills: user.profile?.skills || [],
            experienceHighlights: user.profile?.experienceHighlights || user.bio || "",
            education: user.profile?.education || "",
            lookingFor: user.profile?.lookingFor || "",
            superpower: user.profile?.superpower || "",
            others: user.profile?.others || {},
        };

        return NextResponse.json(profileData);

    } catch (error) {
        console.error('Failed to fetch profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized', message: '请先登录 SecondMe 以保存个人资料' }, { status: 401 });
        }

        const data = await request.json();

        const skills = Array.isArray(data.skills) ? data.skills : [];

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.user.update({
                where: { id: session.id },
                data: {
                    name: data.name || session.name,
                    avatar: data.avatar || session.avatar,
                    bio: data.bio || session.bio,
                },
            });

            await tx.profile.upsert({
                where: { userId: session.id },
                update: {
                    title: data.title,
                    location: data.location,
                    skills: skills,
                    experienceHighlights: data.experienceHighlights,
                    education: data.education,
                    lookingFor: data.lookingFor,
                    superpower: data.superpower,
                    others: data.others,
                },
                create: {
                    userId: session.id,
                    title: data.title,
                    location: data.location,
                    skills: skills,
                    experienceHighlights: data.experienceHighlights,
                    education: data.education,
                    lookingFor: data.lookingFor,
                    superpower: data.superpower,
                    others: data.others,
                },
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to save profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
