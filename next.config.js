/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/play",
        has: [{ type: "host", value: "wrong-app.com" }],
        destination: "https://play.google.com/store/apps/details?id=com.wrongapp.mobile",
        statusCode: 302,
      },
    ];
  },
};

module.exports = nextConfig;
