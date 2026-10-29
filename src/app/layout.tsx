import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Соседи — общежитие № 4", template: "%s · Соседи" },
  icons: { icon: "/icon.svg" },
  description:
    "Объявления общежития, запись на стирку и помощь мастеров в одном месте. Демонстрационный fullstack-проект.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
