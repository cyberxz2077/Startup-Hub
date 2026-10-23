import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Startup Hub · 让想法遇见共建的人",
  description:
    "为创业者和建设者连接项目、能力与合作机会。用自然语言整理想法，找到值得一起开始的人。",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
