/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/download",
        destination: "https://play.google.com/store/apps/details?id=com.wrongapp.mobile",
        statusCode: 302,
      },
    ];
  },
};

module.exports = nextConfig;
