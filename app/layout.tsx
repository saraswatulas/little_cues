import type { Metadata, Viewport } from "next";
import { PwaRegister } from "./pwa-register";
import "./styles.css";

export const metadata: Metadata = {
  title: "Little Cues",
  description: "Age-calculated infant development and health tracking for parents.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Little Cues"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#24594b",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
