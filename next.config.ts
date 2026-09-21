import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Se cargan desde node_modules en tiempo de ejecución (Chromium para PDF y ExcelJS): no se empaquetan
  serverExternalPackages: ["playwright", "playwright-core", "exceljs"],
};

export default nextConfig;
