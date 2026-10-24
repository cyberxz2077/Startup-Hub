import { prisma } from "@/lib/db";
import { memberWhere } from "@/lib/auth";
import { apiError, HttpError, json } from "@/lib/http";
import {
  publicProfileSelect,
  serializePublicProfile,
} from "@/lib/public-profiles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const profile = await prisma.profile.findFirst({
      where: { userId: id, published: true, user: memberWhere },
      select: publicProfileSelect(100),
    });
    if (!profile)
      throw new HttpError(404, "这份个人档案尚未公开或已转为私密。");
    return json(serializePublicProfile(profile));
  } catch (error) {
    return apiError(error);
  }
}
