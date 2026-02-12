import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_SERVICES = [
    {
        name: "TechVentures Capital",
        category: "Investor",
        description: "Early-stage VC focusing on AI and SaaS startups. We invest in visionary founders building transformative technology companies.",
        services: "Seed Funding, Series A, Mentorship, Board Advisory",
        city: "Beijing",
        contact: "contact@techventures.cn",
        website: "https://techventures.cn",
        approved: true
    },
    {
        name: "Innospace Incubator",
        category: "Incubator",
        description: "Premier workspace and accelerator for tech startups. We provide everything you need to go from idea to Series A.",
        services: "Office Space, Legal Support, Networking, Demo Day",
        city: "Shanghai",
        contact: "hello@innospace.cn",
        website: "https://innospace.cn",
        approved: true
    },
    {
        name: "CloudScale Devs",
        category: "Dev Agency",
        description: "Premium software development agency specializing in MVP development for startups. From idea to launch in 8 weeks.",
        services: "MVP Development, Cloud Architecture, Technical Consulting",
        city: "Remote",
        contact: "sales@cloudscale.dev",
        website: "https://cloudscale.dev",
        approved: true
    },
    {
        name: "GrowthHackerz",
        category: "Marketing",
        description: "Data-driven marketing agency for startups. We help you find product-market fit and scale user acquisition.",
        services: "SEO, User Acquisition, Branding, Content Marketing",
        city: "Shenzhen",
        contact: "hi@growthhackerz.io",
        website: "https://growthhackerz.io",
        approved: true
    },
    {
        name: "Startup Legal Partners",
        category: "Legal",
        description: "Full-service law firm specializing in startup legal needs. From incorporation to IPO, we've got you covered.",
        services: "Incorporation, IP Protection, Fundraising Docs, Compliance",
        city: "Beijing",
        contact: "legal@startuplaw.cn",
        website: "https://startuplaw.cn",
        approved: true
    },
    {
        name: "TalentScout HR",
        category: "Recruiting",
        description: "Executive search and talent acquisition for high-growth startups. We find the best talent for your team.",
        services: "Executive Search, Technical Recruiting, Culture Building",
        city: "Shanghai",
        contact: "hire@talentscout.cn",
        website: "https://talentscout.cn",
        approved: true
    },
    {
        name: "FinanceFlow Advisors",
        category: "Accounting",
        description: "Startup-focused accounting and financial advisory. We help you navigate fundraising and financial planning.",
        services: "Bookkeeping, Tax Planning, Financial Modeling, Due Diligence",
        city: "Hangzhou",
        contact: "finance@financeflow.cn",
        website: "https://financeflow.cn",
        approved: true
    },
    {
        name: "DesignCraft Studio",
        category: "Design",
        description: "Award-winning design studio for startups. We create memorable brands and intuitive user experiences.",
        services: "Brand Identity, UI/UX Design, Product Design, Design Systems",
        city: "Guangzhou",
        contact: "design@designcraft.studio",
        website: "https://designcraft.studio",
        approved: true
    }
];

export async function GET() {
    try {
        const count = await prisma.serviceProvider.count();

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
