/**
 * Permission Profiles Extension
 *
 * Two profiles that control what the agent can do:
 *
 *   ask   — confirm before writes, edits, and shell commands
 *   yolo  — allow everything
 *
 * /permissions           — show current profile
 * /permissions ask       — switch to ask
 * /permissions yolo      — switch to yolo
 *
 * Project-local overrides: .pi/permissions.json
 *   { "profile": "ask", "protectedPaths": [".env", "secrets/"] }
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
type PermissionProfile = "ask" | "yolo";

const PROFILES: PermissionProfile[] = ["ask", "yolo"];

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
	let profile: PermissionProfile = "ask";
	let protectedPaths: string[] = [".env"];

	function updateStatus(ctx: ExtensionContext) {
		if (profile === "yolo") {
			ctx.ui.setStatus("permissions", undefined);
			return;
		}
		ctx.ui.setStatus("permissions", ctx.ui.theme.fg("accent", profile));
	}

	function setProfile(nextProfile: PermissionProfile, ctx: ExtensionContext, notify = true) {
		profile = nextProfile;
		updateStatus(ctx);
		pi.appendEntry("permissions-profile", { profile: nextProfile });
		if (notify) ctx.ui.notify(`Permissions: ${nextProfile}`, "info");
	}

	// ── command ──────────────────────────────────────────────

	pi.registerCommand("permissions", {
		description: "Show or set permission profile (ask / yolo)",
		handler: async (args, ctx) => {
			const sub = args.trim().toLowerCase() as PermissionProfile;

			if (!sub) {
				ctx.ui.notify(`Current profile: ${profile}`, "info");
				return;
			}

			if (PROFILES.includes(sub)) {
				setProfile(sub, ctx);
				return;
			}

			ctx.ui.notify(`Unknown profile "${args.trim()}". Use: ask, yolo`, "error");
		},
	});

	// ── tool gating ─────────────────────────────────────────

	pi.on("tool_call", async (event, ctx) => {
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

		// ── ask: confirm writes, shell commands, and web fetches ──
		if (profile === "ask") {
			const requiresConfirmation =
				event.toolName === "write" ||
				event.toolName === "edit" ||
				event.toolName === "bash" ||
				event.toolName === "web_fetch";
			if (!requiresConfirmation) return;
			if (!ctx.hasUI) {
				return { block: true, reason: "No UI to confirm (ask profile)" };
			}

			const detail = event.toolName === "bash"
				? (event.input as { command: string }).command
				: event.toolName === "web_fetch"
					? (event.input as { url: string }).url
					: (event.input as { path: string }).path;
			const ok = await ctx.ui.confirm(`Allow ${event.toolName}?`, detail);
			if (!ok) return { block: true, reason: "Denied by user" };
			return;
		}

		// yolo: allow everything
	});

	// ── system prompt hint ──────────────────────────────────

	pi.on("before_agent_start", async (event) => {
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
		profile = projectConfig.profile && PROFILES.includes(projectConfig.profile)
			? projectConfig.profile
			: profile;

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

		updateStatus(ctx);
	});
}
