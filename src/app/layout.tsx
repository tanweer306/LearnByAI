import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./providers";
import Script from "next/script";
import { inter } from "./fonts";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "LearnByAi - Transform Learning with Artificial Intelligence",
  description:
  "Upload textbooks, get instant AI tutoring, create quizzes, and personalized study plans. Perfect for students, teachers, and schools.",
  icons: {
    icon: "/images/favicon.ico",
    shortcut: "/images/favicon.ico",
  },
};

export default function RootLayout({
  children
}: Readonly<{children: React.ReactNode;}>) {
  return (
    <ClerkProvider data-oid="qh::cm2">
      <html
        lang="en"
        suppressHydrationWarning
        data-oid="1swmn.8"
        className={`${inter.variable}`}>

        <body className="" data-oid="0vs30yy">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
            data-oid="oh4pzt6">

            {children}
          </ThemeProvider>

          <Script
            src="https://cdn.jsdelivr.net/gh/onlook-dev/onlook@d3887f2/apps/web/client/public/onlook-preload-script.js"
            strategy="afterInteractive"
            type="module"
            id="onlook-preload-script"
            data-oid="hzm-829">
          </Script>
        </body>
      </html>
    </ClerkProvider>);

}