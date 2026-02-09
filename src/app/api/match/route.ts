import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { generateMatchScore } from '@/lib/gemini';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type, id } = await request.json(); // type: 'project' | 'profile'

        if (!type || !id) {
            return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
        }

        let matches = [];

        if (type === 'project') {
            // Source is Project, find matching Talents
            const project = await prisma.project.findUnique({ where: { id } });
            if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

            // Fetch top 5 recent profiles for MVP
            const profiles = await prisma.profile.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { user: true }
            });

            const projectStr = JSON.stringify(project);

            for (const profile of profiles) {
                const profileStr = JSON.stringify(profile);
                const result = await generateMatchScore(projectStr, profileStr, 'project_to_talent');

                // Save to DB
                await prisma.matchingResult.upsert({
                    where: {
                        projectId_userId: {
                            projectId: project.id,
                            userId: profile.userId
                        }
                    },
                    update: {
                        score: result.score,
                        reason: result.reason,
                        status: 'calculated'
                    },
                    create: {
                        projectId: project.id,
                        userId: profile.userId,
                        score: result.score,
                        reason: result.reason,
                        status: 'calculated'
                    }
                });

                matches.push({
                    targetId: profile.userId,
                    name: profile.user.name,
                    title: profile.title,
                    ...result
                });
            }

        } else if (type === 'profile') {
            // Source is Profile/User, find matching Projects
            // If id is 'current', use session user id
            const targetUserId = id === 'current' ? session.id : id;

            const profile = await prisma.profile.findUnique({ where: { userId: targetUserId } }); // Use session user's profile
            if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

            // Fetch top 5 recent projects
            const projects = await prisma.project.findMany({
                where: { published: true },
                take: 5,
                orderBy: { createdAt: 'desc' }
            });

            const profileStr = JSON.stringify(profile);

            for (const project of projects) {
                const projectStr = JSON.stringify(project);
                const result = await generateMatchScore(profileStr, projectStr, 'talent_to_project');

                // Save DB
                await prisma.matchingResult.upsert({
                    where: {
                        projectId_userId: {
                            projectId: project.id,
                            userId: session.id
                        }
                    },
                    update: {
                        score: result.score,
                        reason: result.reason,
                        status: 'calculated'
                    },
                    create: {
                        projectId: project.id,
                        userId: session.id,
                        score: result.score,
                        reason: result.reason,
                        status: 'calculated'
                    }
                });

                matches.push({
                    targetId: project.id,
                    name: project.name,
                    sector: project.sector,
                    ...result
                });
            }
        }

        // Sort by score
        matches.sort((a, b) => b.score - a.score);

        return NextResponse.json({ success: true, matches });

    } catch (error) {
        console.error('Match Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
