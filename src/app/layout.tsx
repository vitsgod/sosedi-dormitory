import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "../components/theme-provider";
import { themeBootstrap } from "../lib/theme";
import "./globals.css";
import "./design-system.css";
export const viewport: Viewport = { themeColor: "#f3f5f8" };
export const metadata: Metadata = {
  title: { default: "Соседи — общежитие № 4", template: "%s · Соседи" },
  icons: { icon: "/icon.svg" },
  description:
    "Объявления общежития, запись на стирку и помощь мастеров в одном месте. Демонстрационный fullstack-проект.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/manrope.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Перейти к содержимому
        </a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
