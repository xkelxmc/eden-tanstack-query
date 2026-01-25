import { Elysia, t } from "elysia"
import { db } from "./db/client"
import { CommentPlain, PostPlain, UserPlain } from "./db/models"

export const app = new Elysia()
	// Users
	.get(
		"/users",
		() => {
			return db.user.findMany({ orderBy: { createdAt: "desc" } })
		},
		{
			response: t.Array(UserPlain),
		},
	)
	.get(
		"/users/:id",
		({ params }) => {
			return db.user.findUnique({
				where: { id: params.id },
				include: { posts: true, comments: true },
			})
		},
		{
			response: t.Union([
				t.Composite([
					UserPlain,
					t.Object({
						posts: t.Array(PostPlain),
						comments: t.Array(CommentPlain),
					}),
				]),
				t.Null(),
			]),
		},
	)
	.post(
		"/users",
		({ body }) => {
			return db.user.create({ data: body })
		},
		{
			body: t.Object({
				email: t.String(),
				name: t.Optional(t.String()),
			}),
			response: UserPlain,
		},
	)
	.put(
		"/users/:id",
		({ params, body }) => {
			return db.user.update({ where: { id: params.id }, data: body })
		},
		{
			body: t.Object({
				name: t.Optional(t.String()),
				role: t.Optional(t.String()),
			}),
			response: UserPlain,
		},
	)
	.delete(
		"/users/:id",
		({ params }) => {
			return db.user.delete({ where: { id: params.id } })
		},
		{
			response: UserPlain,
		},
	)

	// Posts
	.get(
		"/posts",
		() => {
			return db.post.findMany({
				orderBy: { createdAt: "desc" },
				include: { author: true },
			})
		},
		{
			response: t.Array(
				t.Composite([PostPlain, t.Object({ author: UserPlain })]),
			),
		},
	)
	.get(
		"/posts/:id",
		({ params }) => {
			return db.post.findUnique({
				where: { id: params.id },
				include: { author: true, comments: true },
			})
		},
		{
			response: t.Union([
				t.Composite([
					PostPlain,
					t.Object({
						author: UserPlain,
						comments: t.Array(CommentPlain),
					}),
				]),
				t.Null(),
			]),
		},
	)
	.post(
		"/posts",
		({ body }) => {
			return db.post.create({ data: body })
		},
		{
			body: t.Object({
				title: t.String(),
				content: t.Optional(t.String()),
				authorId: t.String(),
			}),
			response: PostPlain,
		},
	)
	.put(
		"/posts/:id",
		({ params, body }) => {
			return db.post.update({ where: { id: params.id }, data: body })
		},
		{
			body: t.Object({
				title: t.Optional(t.String()),
				content: t.Optional(t.String()),
				published: t.Optional(t.Boolean()),
			}),
			response: PostPlain,
		},
	)
	.delete(
		"/posts/:id",
		({ params }) => {
			return db.post.delete({ where: { id: params.id } })
		},
		{
			response: PostPlain,
		},
	)

	// Comments
	.get(
		"/posts/:id/comments",
		({ params }) => {
			return db.comment.findMany({
				where: { postId: params.id },
				orderBy: { createdAt: "desc" },
				include: { author: true },
			})
		},
		{
			response: t.Array(
				t.Composite([CommentPlain, t.Object({ author: UserPlain })]),
			),
		},
	)
	.post(
		"/comments",
		({ body }) => {
			return db.comment.create({ data: body })
		},
		{
			body: t.Object({
				text: t.String(),
				postId: t.String(),
				authorId: t.String(),
			}),
			response: CommentPlain,
		},
	)
	.put(
		"/comments/:id",
		({ params, body }) => {
			return db.comment.update({ where: { id: params.id }, data: body })
		},
		{
			body: t.Object({
				text: t.String(),
			}),
			response: CommentPlain,
		},
	)
	.delete(
		"/comments/:id",
		({ params }) => {
			return db.comment.delete({ where: { id: params.id } })
		},
		{
			response: CommentPlain,
		},
	)

export type App = typeof app
