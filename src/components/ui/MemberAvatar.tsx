import Image from "next/image";

export function MemberAvatar({
  name,
  avatar,
}: {
  name: string;
  avatar?: string | null;
}) {
  return (
    <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 text-xl font-semibold text-accent-blue">
      {avatar?.startsWith("data:image/") ? (
        <Image src={avatar} alt="" width={56} height={56} unoptimized />
      ) : (
        <span aria-hidden="true">{Array.from(name.trim())[0] || "H"}</span>
      )}
    </span>
  );
}
