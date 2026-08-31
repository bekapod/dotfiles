/**
 * Permission Profiles Extension
 *
 * Three profiles that control what the agent can do:
 *
 *   safe  — structured read-only tools only
 *   ask   — confirm before writes, edits, and shell commands
 *   yolo  — allow everything
 *
 * /permissions           — show current profile
 * /permissions safe      — switch to safe
 * /permissions ask       — switch to ask
 * /permissions yolo      — switch to yolo
 *
 * Project-local overrides: .pi/permissions.json
 *   { "profile": "ask", "protectedPaths": [".env", "secrets/"] }
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	getToolPolicy,
	type PermissionProfile,
	READ_ONLY_TOOL_NAMES,
	type ToolPolicyUpdate,
} from "./shared/tool-policy.ts";

const PROFILES: PermissionProfile[] = ["safe", "ask", "yolo"];

interface ProjectConfig {
	profile?: PermissionProfile;
	protectedPaths?: string[];
}

function loadProjectConfig(cwd: string): ProjectConfig {
	const configPath = join(cwd, ".pi", "permissions.json");
	if (!existsSync(configPath)) return {};
	try {
		return JSON.parse(readFileSync(configPath, "utf-8")) as ProjectConfig;
	} catch {
		return {};
	}
}

export default function (pi: ExtensionAPI) {
	const toolPolicy = getToolPolicy(pi);
	let protectedPaths: string[] = [".env"];

	function updateStatus(ctx: ExtensionContext) {
		const profile = toolPolicy.getPermissionProfile();
		if (profile === "yolo") {
			ctx.ui.setStatus("permissions", undefined);
			return;
		}
		const color = profile === "safe" ? "warning" : "accent";
		ctx.ui.setStatus("permissions", ctx.ui.theme.fg(color, profile));
	}

	function setProfile(nextProfile: PermissionProfile, ctx: ExtensionContext, notify = true) {
		toolPolicy.update({ permissionProfile: nextProfile });
		updateStatus(ctx);
		pi.appendEntry("permissions-profile", { profile: nextProfile });
		if (notify) ctx.ui.notify(`Permissions: ${nextProfile}`, "info");
	}

	pi.events.on("dotfiles:tool-policy:update", (data: unknown) => {
		const request = data as {
			update: ToolPolicyUpdate;
			ctx?: ExtensionContext;
			notify?: boolean;
		};
		toolPolicy.update(request.update);
		if (request.update.permissionProfile && request.ctx) {
			updateStatus(request.ctx);
			pi.appendEntry("permissions-profile", {
				profile: request.update.permissionProfile,
			});
			if (request.notify) {
				request.ctx.ui.notify(`Permissions: ${request.update.permissionProfile}`, "info");
			}
		}
	});

	pi.events.on("dotfiles:tool-policy:snapshot", (data: unknown) => {
		const respond = data as (snapshot: ReturnType<typeof toolPolicy.snapshot>) => void;
		respond(toolPolicy.snapshot());
	});

	// ── command ──────────────────────────────────────────────

	pi.registerCommand("permissions", {
		description: "Show or set permission profile (safe / ask / yolo)",
		handler: async (args, ctx) => {
			const sub = args.trim().toLowerCase() as PermissionProfile;

			if (!sub) {
				ctx.ui.notify(`Current profile: ${toolPolicy.getPermissionProfile()}`, "info");
				return;
			}

			if (PROFILES.includes(sub)) {
				setProfile(sub, ctx);
				return;
			}

			ctx.ui.notify(`Unknown profile "${args.trim()}". Use: safe, ask, yolo`, "error");
		},
	});

	// ── tool gating ─────────────────────────────────────────

	pi.on("tool_call", async (event, ctx) => {
		const profile = toolPolicy.getPermissionProfile();
		// protected paths block structured file mutations outside yolo
		if (
			profile !== "yolo" &&
			(event.toolName === "write" || event.toolName === "edit")
		) {
			const path = event.input.path as string;
			if (protectedPaths.some((p) => path.includes(p))) {
				return { block: true, reason: `Protected path: ${path}` };
			}
		}

		// ── safe: allow only structured read-only tools ──
		if (profile === "safe") {
			if (!READ_ONLY_TOOL_NAMES.has(event.toolName)) {
				return {
					block: true,
					reason: "Blocked by safe profile. Only read, grep, find, and ls are allowed.",
				};
			}
			return;
		}

		// ── ask: confirm writes and every shell command ──
		if (profile === "ask") {
			const requiresConfirmation =
				event.toolName === "write" ||
				event.toolName === "edit" ||
				event.toolName === "bash";
			if (!requiresConfirmation) return;
			if (!ctx.hasUI) {
				return { block: true, reason: "No UI to confirm (ask profile)" };
			}

			const detail = event.toolName === "bash"
				? (event.input as { command: string }).command
				: (event.input as { path: string }).path;
			const ok = await ctx.ui.confirm(`Allow ${event.toolName}?`, detail);
			if (!ok) return { block: true, reason: "Denied by user" };
			return;
		}

		// yolo: allow everything
	});

	// ── system prompt hint ──────────────────────────────────

	pi.on("before_agent_start", async (event) => {
		const profile = toolPolicy.getPermissionProfile();
		if (profile === "safe") {
			return {
				systemPrompt: `${event.systemPrompt}\n\n[PERMISSIONS: safe] Only the structured read, grep, find, and ls tools are available.`,
			};
		}
		if (profile === "ask") {
			return {
				systemPrompt: `${event.systemPrompt}\n\n[PERMISSIONS: ask] Writes and all shell commands require user confirmation.`,
			};
		}
	});

	// ── session restore ─────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		// Project-local config is executable policy and must respect Pi's trust boundary.
		const projectConfig = ctx.isProjectTrusted() ? loadProjectConfig(ctx.cwd) : {};
		if (projectConfig.protectedPaths) {
			protectedPaths = [...new Set([...protectedPaths, ...projectConfig.protectedPaths])];
		}
		let profile = projectConfig.profile && PROFILES.includes(projectConfig.profile)
			? projectConfig.profile
			: toolPolicy.getPermissionProfile();

		// restore saved profile from session
		const entries = ctx.sessionManager.getEntries();
		const saved = entries
			.filter(
				(e: { type: string; customType?: string }) =>
					e.type === "custom" && e.customType === "permissions-profile",
			)
			.pop() as { data?: { profile: PermissionProfile } } | undefined;

		if (saved?.data?.profile && PROFILES.includes(saved.data.profile)) {
			profile = saved.data.profile;
		}

		toolPolicy.update({ permissionProfile: profile });
		updateStatus(ctx);
	});
}
