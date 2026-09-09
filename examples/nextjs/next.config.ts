import type { NextConfig } from "next"

const nextConfig = {
	agentRules: false,
	async rewrites() {
		return [
			{
				source: "/api/:path*",
				destination: `${process.env.INTERNAL_API_URL ?? "http://127.0.0.1:3001"}/api/:path*`,
			},
		]
	},
} satisfies NextConfig

export default nextConfig
