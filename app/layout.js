"use client";

import "./globals.css";
import { useEffect, useState } from "react";

export default function RootLayout({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="en">
      <body data-mounted={mounted ? "true" : "false"}>{children}</body>
    </html>
  );
}
