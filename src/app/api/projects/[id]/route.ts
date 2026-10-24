import { prisma } from "@/lib/db";
import { apiError, HttpError, json } from "@/lib/http";
import { stringList, textValue } from "@/lib/validation";
import { publicProjectOwnerSelect } from "@/lib/public-profiles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findFirst({
      where: { id, published: true },
      include: { owner: { select: publicProjectOwnerSelect } },
    });
    if (!project) throw new HttpError(404, "这个项目尚未公开或已转为私密。");
    return json({
      ...project,
      owner: {
        name: project.owner.name,
        avatar: project.owner.avatar,
        profilePublished: !!project.owner.profile?.published,
      },
      talentNeeds: stringList(project.talentNeeds),
      others: textValue(project.others),
    });
  } catch (error) {
    return apiError(error);
  }
}
