import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kiếm Thế · Quản trị server",
  description: "Khởi động và theo dõi 8 server Kiếm Thế trên Windows.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="vi"><body>{children}</body></html>;
}
