import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/brief",
        destination:
          "https://gamma.app/docs/Human-AmplifiED-4cbzld47au54ww1",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
