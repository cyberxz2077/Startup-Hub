import "server-only";
import type { Prisma } from "@prisma/client";
import type { PublicProfile } from "@/types";
import { stringList, textValue } from "./validation";
import { memberWhere } from "./auth";

export const publicProjectOwnerSelect = {
  name: true,
  avatar: true,
  profile: {
    where: { published: true, user: memberWhere },
    select: { published: true },
  },
} as const;

// Explicit allowlist: account credentials and private projects never enter a
// public response. The list previews three projects; the detail shows up to 100.
export function publicProfileSelect(projectLimit: number) {
  return {
    userId: true,
    title: true,
    location: true,
    skills: true,
    experienceHighlights: true,
    education: true,
    lookingFor: true,
    superpower: true,
    others: true,
    updatedAt: true,
    user: {
      select: {
        name: true,
        avatar: true,
        bio: true,
        projects: {
          where: { published: true },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: projectLimit,
          select: {
            id: true,
            name: true,
            oneLiner: true,
            sector: true,
            stage: true,
          },
        },
        _count: { select: { projects: { where: { published: true } } } },
      },
    },
  } as const satisfies Prisma.ProfileSelect;
}

type PublicRecord = Prisma.ProfileGetPayload<{
  select: ReturnType<typeof publicProfileSelect>;
}>;

export function serializePublicProfile(profile: PublicRecord): PublicProfile {
  return {
    userId: profile.userId,
    name: profile.user.name || "社区成员",
    avatar: /^data:image\/(jpeg|png|webp);base64,/.test(
      profile.user.avatar || "",
    )
      ? profile.user.avatar!
      : "",
    bio: textValue(profile.user.bio),
    title: textValue(profile.title),
    location: textValue(profile.location),
    skills: stringList(profile.skills),
    experienceHighlights: textValue(profile.experienceHighlights),
    education: textValue(profile.education),
    lookingFor: textValue(profile.lookingFor),
    superpower: textValue(profile.superpower),
    others: textValue(profile.others),
    updatedAt: profile.updatedAt.toISOString(),
    projects: profile.user.projects.map((project) => ({
      id: project.id,
      name: project.name,
      oneLiner: textValue(project.oneLiner),
      sector: textValue(project.sector),
      stage: textValue(project.stage),
    })),
    projectCount: profile.user._count.projects,
  };
}
