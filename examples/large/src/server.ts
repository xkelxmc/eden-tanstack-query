import { Elysia, t } from "elysia"
import { db } from "./db/client"
import {
	ApiKeyPlain,
	AuditLogPlain,
	CategoryPlain,
	CommentPlain,
	FilePlain,
	InvoicePlain,
	MemberPlain,
	NotificationPlain,
	OrganizationPlain,
	PostPlain,
	SessionPlain,
	SettingsPlain,
	SubscriptionPlain,
	TagPlain,
	UserPlain,
} from "./db/models"

export const app = new Elysia()
	// Users
	.get("/users", () => db.user.findMany({ orderBy: { createdAt: "desc" } }), {
		response: t.Array(UserPlain),
	})
	.get(
		"/users/:id",
		({ params }) =>
			db.user.findUnique({
				where: { id: params.id },
				include: { posts: true, comments: true },
			}),
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
	.post("/users", ({ body }) => db.user.create({ data: body }), {
		body: t.Object({
			email: t.String(),
			name: t.Optional(t.String()),
		}),
		response: UserPlain,
	})
	.put(
		"/users/:id",
		({ params, body }) =>
			db.user.update({ where: { id: params.id }, data: body }),
		{
			body: t.Object({
				name: t.Optional(t.String()),
			}),
			response: UserPlain,
		},
	)
	.delete(
		"/users/:id",
		({ params }) => db.user.delete({ where: { id: params.id } }),
		{
			response: UserPlain,
		},
	)

	// Organizations
	.get(
		"/organizations",
		() => db.organization.findMany({ orderBy: { createdAt: "desc" } }),
		{
			response: t.Array(OrganizationPlain),
		},
	)
	.get(
		"/organizations/:id",
		({ params }) =>
			db.organization.findUnique({
				where: { id: params.id },
				include: { members: true, settings: true },
			}),
		{
			response: t.Union([
				t.Composite([
					OrganizationPlain,
					t.Object({
						members: t.Array(MemberPlain),
						settings: t.Union([SettingsPlain, t.Null()]),
					}),
				]),
				t.Null(),
			]),
		},
	)
	.post(
		"/organizations",
		({ body }) => db.organization.create({ data: body }),
		{
			body: t.Object({
				name: t.String(),
				slug: t.String(),
			}),
			response: OrganizationPlain,
		},
	)
	.put(
		"/organizations/:id",
		({ params, body }) =>
			db.organization.update({ where: { id: params.id }, data: body }),
		{
			body: t.Object({
				name: t.Optional(t.String()),
			}),
			response: OrganizationPlain,
		},
	)
	.delete(
		"/organizations/:id",
		({ params }) => db.organization.delete({ where: { id: params.id } }),
		{
			response: OrganizationPlain,
		},
	)

	// Members
	.get(
		"/organizations/:id/members",
		({ params }) =>
			db.member.findMany({
				where: { organizationId: params.id },
				include: { user: true },
			}),
		{
			response: t.Array(
				t.Composite([MemberPlain, t.Object({ user: UserPlain })]),
			),
		},
	)
	.post("/members", ({ body }) => db.member.create({ data: body }), {
		body: t.Object({
			userId: t.String(),
			organizationId: t.String(),
			role: t.Optional(t.String()),
		}),
		response: MemberPlain,
	})
	.put(
		"/members/:id",
		({ params, body }) =>
			db.member.update({ where: { id: params.id }, data: body }),
		{
			body: t.Object({
				role: t.String(),
			}),
			response: MemberPlain,
		},
	)
	.delete(
		"/members/:id",
		({ params }) => db.member.delete({ where: { id: params.id } }),
		{
			response: MemberPlain,
		},
	)

	// Posts
	.get(
		"/posts",
		() =>
			db.post.findMany({
				orderBy: { createdAt: "desc" },
				include: { author: true, category: true },
			}),
		{
			response: t.Array(
				t.Composite([
					PostPlain,
					t.Object({
						author: UserPlain,
						category: t.Union([CategoryPlain, t.Null()]),
					}),
				]),
			),
		},
	)
	.get(
		"/posts/:id",
		({ params }) =>
			db.post.findUnique({
				where: { id: params.id },
				include: { author: true, comments: true, tags: true },
			}),
		{
			response: t.Union([
				t.Composite([
					PostPlain,
					t.Object({
						author: UserPlain,
						comments: t.Array(CommentPlain),
						tags: t.Array(TagPlain),
					}),
				]),
				t.Null(),
			]),
		},
	)
	.post("/posts", ({ body }) => db.post.create({ data: body }), {
		body: t.Object({
			title: t.String(),
			content: t.Optional(t.String()),
			authorId: t.String(),
		}),
		response: PostPlain,
	})
	.put(
		"/posts/:id",
		({ params, body }) =>
			db.post.update({ where: { id: params.id }, data: body }),
		{
			body: t.Object({
				title: t.Optional(t.String()),
				published: t.Optional(t.Boolean()),
			}),
			response: PostPlain,
		},
	)
	.delete(
		"/posts/:id",
		({ params }) => db.post.delete({ where: { id: params.id } }),
		{
			response: PostPlain,
		},
	)

	// Comments
	.get(
		"/posts/:id/comments",
		({ params }) =>
			db.comment.findMany({
				where: { postId: params.id },
				include: { author: true },
			}),
		{
			response: t.Array(
				t.Composite([CommentPlain, t.Object({ author: UserPlain })]),
			),
		},
	)
	.post("/comments", ({ body }) => db.comment.create({ data: body }), {
		body: t.Object({
			text: t.String(),
			postId: t.String(),
			authorId: t.String(),
		}),
		response: CommentPlain,
	})
	.delete(
		"/comments/:id",
		({ params }) => db.comment.delete({ where: { id: params.id } }),
		{
			response: CommentPlain,
		},
	)

	// Categories
	.get(
		"/categories",
		() => db.category.findMany({ orderBy: { name: "asc" } }),
		{
			response: t.Array(CategoryPlain),
		},
	)
	.post("/categories", ({ body }) => db.category.create({ data: body }), {
		body: t.Object({
			name: t.String(),
			slug: t.String(),
		}),
		response: CategoryPlain,
	})
	.delete(
		"/categories/:id",
		({ params }) => db.category.delete({ where: { id: params.id } }),
		{
			response: CategoryPlain,
		},
	)

	// Tags
	.get("/tags", () => db.tag.findMany({ orderBy: { name: "asc" } }), {
		response: t.Array(TagPlain),
	})
	.post("/tags", ({ body }) => db.tag.create({ data: body }), {
		body: t.Object({
			name: t.String(),
			slug: t.String(),
		}),
		response: TagPlain,
	})
	.delete(
		"/tags/:id",
		({ params }) => db.tag.delete({ where: { id: params.id } }),
		{
			response: TagPlain,
		},
	)

	// Files
	.get(
		"/files",
		({ query }) =>
			db.file.findMany({
				where: query.userId ? { userId: query.userId } : undefined,
				orderBy: { createdAt: "desc" },
			}),
		{
			response: t.Array(FilePlain),
		},
	)
	.post("/files", ({ body }) => db.file.create({ data: body }), {
		body: t.Object({
			name: t.String(),
			url: t.String(),
			size: t.Number(),
			mimeType: t.String(),
			userId: t.String(),
		}),
		response: FilePlain,
	})
	.delete(
		"/files/:id",
		({ params }) => db.file.delete({ where: { id: params.id } }),
		{
			response: FilePlain,
		},
	)

	// Notifications
	.get(
		"/users/:id/notifications",
		({ params }) =>
			db.notification.findMany({
				where: { userId: params.id },
				orderBy: { createdAt: "desc" },
			}),
		{
			response: t.Array(NotificationPlain),
		},
	)
	.put(
		"/notifications/:id/read",
		({ params }) =>
			db.notification.update({
				where: { id: params.id },
				data: { read: true },
			}),
		{
			response: NotificationPlain,
		},
	)
	.delete(
		"/notifications/:id",
		({ params }) => db.notification.delete({ where: { id: params.id } }),
		{
			response: NotificationPlain,
		},
	)

	// Settings
	.get(
		"/organizations/:id/settings",
		({ params }) =>
			db.settings.findUnique({ where: { organizationId: params.id } }),
		{
			response: t.Union([SettingsPlain, t.Null()]),
		},
	)
	.put(
		"/organizations/:id/settings",
		({ params, body }) =>
			db.settings.upsert({
				where: { organizationId: params.id },
				create: { organizationId: params.id, ...body },
				update: body,
			}),
		{
			body: t.Object({
				theme: t.Optional(t.String()),
				language: t.Optional(t.String()),
			}),
			response: SettingsPlain,
		},
	)

	// Audit Logs
	.get(
		"/audit-logs",
		({ query }) =>
			db.auditLog.findMany({
				where: { userId: query.userId, entity: query.entity },
				orderBy: { createdAt: "desc" },
				take: 100,
			}),
		{
			response: t.Array(AuditLogPlain),
		},
	)
	.post("/audit-logs", ({ body }) => db.auditLog.create({ data: body }), {
		body: t.Object({
			action: t.String(),
			entity: t.String(),
			entityId: t.String(),
			userId: t.String(),
			metadata: t.Optional(t.String()),
		}),
		response: AuditLogPlain,
	})

	// Sessions
	.get(
		"/users/:id/sessions",
		({ params }) =>
			db.session.findMany({
				where: { userId: params.id },
				orderBy: { createdAt: "desc" },
			}),
		{
			response: t.Array(SessionPlain),
		},
	)
	.delete(
		"/sessions/:id",
		({ params }) => db.session.delete({ where: { id: params.id } }),
		{
			response: SessionPlain,
		},
	)
	.delete(
		"/users/:id/sessions",
		({ params }) => db.session.deleteMany({ where: { userId: params.id } }),
		{
			response: t.Object({ count: t.Number() }),
		},
	)

	// API Keys
	.get(
		"/users/:id/api-keys",
		({ params }) =>
			db.apiKey.findMany({
				where: { userId: params.id },
				orderBy: { createdAt: "desc" },
			}),
		{
			response: t.Array(ApiKeyPlain),
		},
	)
	.post("/api-keys", ({ body }) => db.apiKey.create({ data: body }), {
		body: t.Object({
			name: t.String(),
			key: t.String(),
			userId: t.String(),
		}),
		response: ApiKeyPlain,
	})
	.delete(
		"/api-keys/:id",
		({ params }) => db.apiKey.delete({ where: { id: params.id } }),
		{
			response: ApiKeyPlain,
		},
	)

	// Subscriptions
	.get(
		"/organizations/:id/subscription",
		({ params }) =>
			db.subscription.findUnique({ where: { organizationId: params.id } }),
		{
			response: t.Union([SubscriptionPlain, t.Null()]),
		},
	)
	.put(
		"/organizations/:id/subscription",
		({ params, body }) =>
			db.subscription.upsert({
				where: { organizationId: params.id },
				create: { organizationId: params.id, plan: body.plan },
				update: body,
			}),
		{
			body: t.Object({
				plan: t.String(),
				status: t.Optional(t.String()),
			}),
			response: SubscriptionPlain,
		},
	)

	// Invoices
	.get(
		"/organizations/:id/invoices",
		({ params }) =>
			db.invoice.findMany({
				where: { organizationId: params.id },
				orderBy: { createdAt: "desc" },
			}),
		{
			response: t.Array(InvoicePlain),
		},
	)
	.get(
		"/invoices/:id",
		({ params }) => db.invoice.findUnique({ where: { id: params.id } }),
		{
			response: t.Union([InvoicePlain, t.Null()]),
		},
	)
	.post("/invoices", ({ body }) => db.invoice.create({ data: body }), {
		body: t.Object({
			number: t.String(),
			amount: t.Number(),
			organizationId: t.String(),
			dueDate: t.Date(),
		}),
		response: InvoicePlain,
	})
	.put(
		"/invoices/:id/paid",
		({ params }) =>
			db.invoice.update({
				where: { id: params.id },
				data: { status: "paid", paidAt: new Date() },
			}),
		{
			response: InvoicePlain,
		},
	)

export type App = typeof app
