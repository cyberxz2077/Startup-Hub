import { prisma } from "@/lib/db";
import { memberWhere } from "@/lib/auth";
import { apiError, json } from "@/lib/http";
import {
  publicProfileSelect,
  serializePublicProfile,
} from "@/lib/public-profiles";

export async function GET() {
  try {
    const profiles = await prisma.profile.findMany({
      where: { published: true, user: memberWhere },
      orderBy: [{ updatedAt: "desc" }, { userId: "desc" }],
      take: 100,
      select: publicProfileSelect(3),
    });
    return json(profiles.map(serializePublicProfile));
  } catch (error) {
    return apiError(error);
  }
}
