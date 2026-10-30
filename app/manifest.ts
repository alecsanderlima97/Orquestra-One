import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orquestra One",
    short_name: "One",
    description: "Gestão simples para serviços, clientes e financeiro.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#0e1727",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
