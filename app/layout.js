import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MuiProvider from "../app/api/components/MuiProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Meu Resumidor",
  description: "Aplicação Next.js com MUI e integração com Ollama",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <MuiProvider>
          {children}
        </MuiProvider>
      </body>
    </html>
  );
}
