import { type DataTag, skipToken } from "@tanstack/react-query"
import { type EdenQueryKey, edenQueryOptions } from "eden-tanstack-react-query"

interface UserInput {
	id: string
}

interface User {
	id: string
}

const fetchUser = async (input: UserInput) => ({ id: input.id })

const enabled = edenQueryOptions({
	path: ["users", "get"],
	input: { id: "1" },
	fetch: fetchUser,
	opts: { staleTime: 1_000 },
})

const defined = edenQueryOptions({
	path: ["users", "get"],
	input: { id: "1" },
	fetch: fetchUser,
	opts: { initialData: { id: "cached" } },
})

const skipped = edenQueryOptions({
	path: ["users", "get"],
	input: skipToken,
	fetch: fetchUser,
})

const taggedKey: DataTag<EdenQueryKey, User, Error> = enabled.queryKey

// @ts-expect-error query keys must not degrade to any
const invalidKey: number = skipped.queryKey

void [defined, taggedKey, invalidKey]
