import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.id },
            include: { profile: true } // Include the profile relation
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Construct ProfileData from User and Profile
        const profileData = {
            name: user.name || "",
            avatar: user.avatar || undefined,
            bio: user.bio || "", // User bio takes precedence or fallback? Let's use user bio.

            // Profile specific fields
            title: user.profile?.title || "",
            location: user.profile?.location || "",
            skills: user.profile?.skills || [],
            experienceHighlights: user.profile?.experienceHighlights || "",
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();

        // No manual stringify needed
        const skills = Array.isArray(data.skills) ? data.skills : [];

        // Transaction to update User and Upsert Profile
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Update basic user info
            await tx.user.update({
                where: { id: session.id },
                data: {
                    name: data.name || session.name,
                    avatar: data.avatar || session.avatar,
                    bio: data.bio || session.bio,
                },
            });

            // 2. Upsert Profile
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
