import { prisma } from "@/lib/db";
import { apiError, json } from "@/lib/http";
import { safeWebsite } from "@/lib/validation";
export async function GET() {
  try {
    const services = await prisma.serviceProvider.findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return json(
      services.map((service) => ({
        ...service,
        website: safeWebsite(service.website),
      })),
    );
  } catch (error) {
    return apiError(error);
  }
}
