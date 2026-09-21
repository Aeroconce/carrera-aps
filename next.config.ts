import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Se cargan desde node_modules en tiempo de ejecución (Chromium para PDF y ExcelJS): no se empaquetan
  serverExternalPackages: ["playwright", "playwright-core", "exceljs"],
  // La planilla de carga inicial viaja en una server action (doc 08): hasta 10 MB
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
