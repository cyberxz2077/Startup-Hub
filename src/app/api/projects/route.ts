import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();

        // Validate required fields (basic check)
        if (!data.name || !data.vision) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // No manual stringify needed for PostgreSQL Json types
        const talentNeeds = Array.isArray(data.talentNeeds) ? data.talentNeeds : [];

        const project = await prisma.project.create({
            data: {
                ownerId: session.id,
                name: data.name,
                oneLiner: data.oneLiner,
                sector: data.sector,
                location: data.location,
                stage: data.stage,
                vision: data.vision,
                problem: data.problem,
                solution: data.solution,
                talentNeeds: talentNeeds,
                productHighlights: data.productHighlights,
                targetAudience: data.targetAudience,
                businessModel: data.businessModel,
                differentiation: data.differentiation,
                marketSize: data.marketSize,
                teamMembers: data.teamMembers,
                whyNow: data.whyNow,
                longTermMoat: data.longTermMoat,
                roadmapFinance: data.roadmapFinance,
                others: data.others,
                published: true, // Auto-publish for now
            },
        });

        return NextResponse.json({ success: true, projectId: project.id });
    } catch (error) {
        console.error('Failed to create project:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

export async function GET() {
    try {
        const projects = await prisma.project.findMany({
            where: { published: true },
            orderBy: { createdAt: 'desc' },
            include: { owner: { select: { name: true, avatar: true } } }
        });

        const parsedProjects = projects.map((p: any) => ({
            ...p,
            talentNeeds: p.talentNeeds || [],
        }));

        return NextResponse.json(parsedProjects);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
