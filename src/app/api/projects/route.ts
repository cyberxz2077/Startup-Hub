import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_PROJECTS = [
    {
        name: "AI Health Assistant",
        oneLiner: "AI-powered personal health companion for chronic disease management",
        sector: "Healthcare AI",
        location: "Beijing",
        stage: "Seed",
        vision: "Make quality healthcare accessible to everyone through AI",
        problem: "Chronic disease patients struggle with daily management and medication adherence",
        solution: "AI companion that monitors, reminds, and provides personalized health insights",
        talentNeeds: ["ML Engineer", "Mobile Developer", "Healthcare PM"],
        productHighlights: "Real-time health monitoring, medication reminders, AI diagnosis support",
        targetAudience: "Chronic disease patients and their families",
        businessModel: "B2B2C - Partner with hospitals and insurance companies",
        differentiation: "Proprietary health AI model trained on 10M+ patient records",
        marketSize: "$50B global digital health market",
        teamMembers: "3 co-founders from top medical AI labs",
        whyNow: "Post-pandemic surge in digital health adoption",
        longTermMoat: "Accumulated patient data and hospital partnerships",
        roadmapFinance: "Seed round: $2M for product development and hospital pilots",
        published: true
    },
    {
        name: "GreenChain",
        oneLiner: "Blockchain-based carbon credit marketplace for enterprises",
        sector: "Climate Tech",
        location: "Shanghai",
        stage: "Series A",
        vision: "Accelerate the world's transition to net-zero emissions",
        problem: "Enterprises lack transparent and trustworthy carbon credit trading",
        solution: "Decentralized marketplace with verified carbon credits and real-time tracking",
        talentNeeds: ["Blockchain Developer", "Climate Scientist", "BD Manager"],
        productHighlights: "Smart contract verification, real-time ESG reporting, API integration",
        targetAudience: "Fortune 500 companies and carbon offset projects",
        businessModel: "Transaction fees + premium verification services",
        differentiation: "Only platform with on-chain verification from major auditors",
        marketSize: "$100B carbon credit market by 2030",
        teamMembers: "Ex-McKinsey, ex-ConsenSys, climate PhDs",
        whyNow: "Regulatory pressure and corporate ESG commitments",
        longTermMoat: "Network effects and auditor partnerships",
        roadmapFinance: "Series A: $10M for global expansion",
        published: true
    },
    {
        name: "SkillSync",
        oneLiner: "AI-powered skill assessment and upskilling platform",
        sector: "EdTech",
        location: "Shenzhen",
        stage: "Pre-seed",
        vision: "Close the global skills gap through personalized learning paths",
        problem: "Traditional education doesn't match industry skill requirements",
        solution: "AI assessments + curated learning content + job matching",
        talentNeeds: ["Full-stack Developer", "Content Designer", "Growth Hacker"],
        productHighlights: "Adaptive assessments, personalized curriculum, job recommendations",
        targetAudience: "Career changers and recent graduates",
        businessModel: "Freemium + B2B enterprise training",
        differentiation: "Real-time skill mapping with job market demands",
        marketSize: "$300B global corporate training market",
        teamMembers: "Former Coursera and LinkedIn Learning engineers",
        whyNow: "Remote work and rapid skill obsolescence",
        longTermMoat: "Proprietary skill graph and employer partnerships",
        roadmapFinance: "Pre-seed: $500K for MVP and pilot programs",
        published: true
    },
    {
        name: "RoboFarm",
        oneLiner: "Autonomous farming robots for sustainable agriculture",
        sector: "AgTech",
        location: "Chengdu",
        stage: "Seed",
        vision: "Feed the world sustainably with AI-powered precision farming",
        problem: "Labor shortage and environmental impact of traditional farming",
        solution: "Autonomous robots for planting, monitoring, and harvesting",
        talentNeeds: ["Robotics Engineer", "Computer Vision Expert", "Agriculture Specialist"],
        productHighlights: "Solar-powered robots, crop health AI, yield optimization",
        targetAudience: "Mid-size farms and agricultural cooperatives",
        businessModel: "RaaS (Robots as a Service) - subscription model",
        differentiation: "Only solution combining autonomy with sustainability metrics",
        marketSize: "$25B agricultural robotics market",
        teamMembers: "CMU robotics PhDs and generational farmers",
        whyNow: "Labor costs rising and sustainability regulations tightening",
        longTermMoat: "Farm data network and proprietary crop models",
        roadmapFinance: "Seed: $3M for manufacturing and pilot deployments",
        published: true
    },
    {
        name: "MetaOffice",
        oneLiner: "Immersive virtual workspace for distributed teams",
        sector: "Enterprise Software",
        location: "Hangzhou",
        stage: "Series A",
        vision: "Make remote work feel like being together",
        problem: "Remote teams struggle with collaboration and company culture",
        solution: "VR/AR-powered virtual offices with real-time collaboration",
        talentNeeds: ["Unity Developer", "3D Designer", "Enterprise Sales"],
        productHighlights: "Spatial audio, virtual whiteboards, AI meeting assistant",
        targetAudience: "Tech companies and creative agencies",
        businessModel: "SaaS subscription per user",
        differentiation: "Most realistic virtual presence and seamless tool integrations",
        marketSize: "$50B virtual collaboration market",
        teamMembers: "Former Meta and Unity engineers",
        whyNow: "Hybrid work is the new normal",
        longTermMoat: "Network effects and enterprise integrations",
        roadmapFinance: "Series A: $15M for platform expansion",
        published: true
    },
    {
        name: "FinFlow",
        oneLiner: "Embedded finance infrastructure for SaaS platforms",
        sector: "FinTech",
        location: "Remote",
        stage: "Seed",
        vision: "Enable every software company to become a fintech",
        problem: "SaaS platforms want financial services but lack infrastructure",
        solution: "API-first banking, payments, and lending infrastructure",
        talentNeeds: ["Backend Engineer", "Compliance Expert", "DevRel"],
        productHighlights: "White-label banking, instant payouts, revenue-based financing",
        targetAudience: "Vertical SaaS platforms and marketplaces",
        businessModel: "Transaction fees + interest income",
        differentiation: "Fastest integration time and most comprehensive offering",
        marketSize: "$400B embedded finance market",
        teamMembers: "Ex-Stripe, ex-Plaid, banking veterans",
        whyNow: "Embedded finance adoption accelerating",
        longTermMoat: "Regulatory licenses and bank partnerships",
        roadmapFinance: "Seed: $5M for compliance and bank partnerships",
        published: true
    }
];

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();

        if (!data.name || !data.vision) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

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
                published: true,
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
        const count = await prisma.project.count();

        if (count === 0) {
            const session = await getSession();
            let ownerId = session?.id;
            
            if (!ownerId) {
                const firstUser = await prisma.user.findFirst();
                if (firstUser) {
                    ownerId = firstUser.id;
                }
            }

            if (ownerId) {
                for (const project of TEST_PROJECTS) {
                    await prisma.project.create({
                        data: {
                            ...project,
                            talentNeeds: project.talentNeeds || [],
                            ownerId: ownerId
                        }
                    });
                }
            }
        }

        const projects = await prisma.project.findMany({
            where: { published: true },
            orderBy: { createdAt: 'desc' },
            include: { owner: { select: { name: true, avatar: true } } }
        });

        const parsedProjects = projects.map((p) => ({
            ...p,
            talentNeeds: p.talentNeeds || [],
        }));

        return NextResponse.json(parsedProjects);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
