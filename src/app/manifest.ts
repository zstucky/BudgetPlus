import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Budget+",
    short_name: "Budget+",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0e12",
    theme_color: "#0b0e12",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}