import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Little Cues",
    short_name: "Little Cues",
    description: "Age-calculated infant care logging with deterministic safety guardrails.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7fbf8",
    theme_color: "#24594b",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
