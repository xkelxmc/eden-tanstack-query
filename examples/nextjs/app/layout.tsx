import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
	title: "Shared reading list",
	description: "An Eden TanStack Query example with Next.js App Router.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
