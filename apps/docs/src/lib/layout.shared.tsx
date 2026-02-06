import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"

export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: "Eden TanStack Query",
		},
		githubUrl: "https://github.com/xkelxmc/eden-tanstack-query",
		links: [
			{
				text: "Documentation",
				url: "/docs",
				active: "nested-url",
			},
		],
	}
}
