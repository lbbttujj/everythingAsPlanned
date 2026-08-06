import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Всё по плану",
    short_name: "По плану",
    description: "Умный ежедневник для дел, целей и личного движения вперёд.",
    start_url: "/",
    display: "standalone",
    background_color: "#090b12",
    theme_color: "#090b12",
    lang: "ru",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
