import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_SERVICES = [
    {
        name: "TechVentures Capital",
        category: "investor",
        description: "Early-stage VC focusing on AI and SaaS.",
        services: "Seed Funding, Mentorship",
        city: "Beijing",
        contact: "contact@techventures.cn",
        website: "https://techventures.cn",
        approved: true
    },
    {
        name: "Innospace Incubator",
        category: "incubator",
        description: "Premier workspace for tech startups.",
        services: "Office Space, Legal Support, Networking",
        city: "Shanghai",
        contact: "hello@innospace.cn",
        approved: true
    },
    {
        name: "CloudScale Devs",
        category: "outsourcing",
        description: "Premium software development agency.",
        services: "MVP Development, Cloud Architecture",
        city: "Remote",
        contact: "sales@cloudscale.dev",
        approved: true
    },
    {
        name: "GrowthHackerz",
        category: "marketing",
        description: "Data-driven marketing for startups.",
        services: "SEO, User Acquisition, Branding",
        city: "Shenzhen",
        contact: "hi@growthhackerz.io",
        approved: true
    }
];

export async function GET() {
    try {
        const count = await prisma.serviceProvider.count();

        // Auto-seed if empty for demo purposes
        if (count === 0) {
            await prisma.serviceProvider.createMany({
                data: DEFAULT_SERVICES
            });
        }

        const services = await prisma.serviceProvider.findMany({
            where: { approved: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(services);
    } catch (error) {
        console.error("Failed to fetch services:", error);
        return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
