import type { Metadata } from "next";
import "./globals.css";
import "./characters.css";

export const metadata: Metadata = {
  title: "云阙三国 · 群星觉醒",
  description: "以羁绊为阵，以群星为刃。原创三国幻想角色 RPG，英杰列阵，战法共鸣。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
