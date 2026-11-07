import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VaultFlow - Personal Finance",
    short_name: "VaultFlow",
    description: "Lightweight, ultra-fast personal finance manager powered by Next.js & Turso.",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Ghi giao dịch nhanh",
        short_name: "Ghi chép",
        description: "Thêm khoản chi tiêu hoặc thu nhập mới ngay lập tức",
        url: "/?action=quick-add",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Sổ giao dịch",
        short_name: "Giao dịch",
        description: "Xem toàn bộ lịch sử chi tiêu",
        url: "/transactions",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Quản lý Ví",
        short_name: "Ví",
        description: "Xem số dư tiền mặt, ngân hàng, thẻ tín dụng",
        url: "/wallets",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Ngân sách & Báo cáo",
        short_name: "Ngân sách",
        description: "Theo dõi tiến độ ngân sách tháng",
        url: "/budgets",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
