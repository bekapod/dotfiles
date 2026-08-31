/**
 * Presets Extension — Hierarchical
 *
 * Two-level preset picker: collection → role.
 *
 * /preset                     — pick collection, then role
 * /preset openai              — pick role within openai
 * /preset openai/orchestrator — switch directly
 * /preset off                 — clear, restore defaults
 * Ctrl+Shift+U               — cycle through presets
 * pi --preset openai/oracle   — start with a preset
 *
 * Config files (merged, project takes precedence):
 *   ~/.pi/agent/presets.json   — global
 *   .pi/presets.json           — project-local
 *
 * Format:
 * {
 *   "claude": {
 *     "orchestrator": { "label": "...", "provider": "...", "model": "...", ... },
 *     "oracle": { ... }
 *   },
 *   "openai": { ... }
 * }
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { CONFIG_DIR_NAME, DynamicBorder, getAgentDir } from "@earendil-works/pi-coding-agent";
import { Container, Key, type SelectItem, SelectList, Text } from "@earendil-works/pi-tui";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import type {
	PermissionProfile,
	ToolPolicySnapshot,
} from "../shared/tool-policy.ts";

// ── types ───────────────────────────────────────────────

const ThinkingLevelSchema = Type.Union([
	Type.Literal("off"),
	Type.Literal("minimal"),
	Type.Literal("low"),
	Type.Literal("medium"),
	Type.Literal("high"),
	Type.Literal("xhigh"),
	Type.Literal("max"),
]);
const PermissionProfileSchema = Type.Union([
	Type.Literal("safe"),
	Type.Literal("ask"),
	Type.Literal("yolo"),
]);
const RoleSchema = Type.Object({
	label: Type.Optional(Type.String()),
	description: Type.Optional(Type.String()),
	provider: Type.Optional(Type.String()),
	model: Type.Optional(Type.String()),
	thinkingLevel: Type.Optional(ThinkingLevelSchema),
	tools: Type.Optional(Type.Array(Type.String())),
	permissions: Type.Optional(PermissionProfileSchema),
	skills: Type.Optional(Type.Array(Type.String())),
	instructions: Type.Optional(Type.String()),
}, { additionalProperties: false });
const PresetsConfigSchema = Type.Record(Type.String(), Type.Record(Type.String(), RoleSchema));

type ThinkingLevel = Static<typeof ThinkingLevelSchema>;
type RoleDef = Static<typeof RoleSchema>;
type PresetsConfig = Static<typeof PresetsConfigSchema>;

interface ActivePreset {
	collection: string;
	role: string;
	def: RoleDef;
}

interface OriginalState {
	model?: { provider: string; id: string };
	thinkingLevel: ThinkingLevel;
	permissions: PermissionProfile;
}

// ── skill loading ───────────────────────────────────────

const SKILL_DIRS = [
	join(getAgentDir(), "skills"),
	join(process.env.HOME ?? "~", ".agents", "skills"),
];

const SKILL_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function findSkillFile(name: string, cwd: string, projectTrusted: boolean): string | undefined {
	if (!SKILL_NAME_PATTERN.test(name)) return undefined;
	const projectDirs = projectTrusted
		? [join(cwd, CONFIG_DIR_NAME, "skills"), join(cwd, ".agents", "skills")]
		: [];
	for (const dir of [...projectDirs, ...SKILL_DIRS]) {
		const dirPath = join(dir, name, "SKILL.md");
		if (existsSync(dirPath)) return dirPath;
		const mdPath = join(dir, `${name}.md`);
		if (existsSync(mdPath)) return mdPath;
	}
	return undefined;
}

function loadSkillContent(name: string, cwd: string, projectTrusted: boolean): string | undefined {
	const path = findSkillFile(name, cwd, projectTrusted);
	if (!path) return undefined;
	try { return readFileSync(path, "utf-8"); } catch { return undefined; }
}

// ── config loading ──────────────────────────────────────

function loadPresetFile(path: string): PresetsConfig {
	if (!existsSync(path)) return {};
	let value: unknown;
	try {
		value = JSON.parse(readFileSync(path, "utf-8"));
	} catch (error) {
		console.error(`Failed to parse presets from ${path}: ${error}`);
		return {};
	}
	if (!Value.Check(PresetsConfigSchema, value)) {
		const error = Value.Errors(PresetsConfigSchema, value)[0];
		const location = error?.instancePath || "$";
		console.error(`Invalid presets in ${path} at ${location}: ${error?.message ?? "unknown validation error"}`);
		return {};
	}
	return value;
}

function loadPresets(cwd: string, projectTrusted: boolean): PresetsConfig {
	const global = loadPresetFile(join(getAgentDir(), "presets.json"));
	const project = projectTrusted
		? loadPresetFile(join(cwd, CONFIG_DIR_NAME, "presets.json"))
		: {};

	const merged: PresetsConfig = {};
	for (const col of new Set([...Object.keys(global), ...Object.keys(project)])) {
		merged[col] = { ...global[col], ...project[col] };
	}
	return merged;
}

// ── extension ───────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	let presets: PresetsConfig = {};
	let active: ActivePreset | undefined;
	let originalState: OriginalState | undefined;
	let originalTools: string[] | undefined;
	let loadedSkillContent: string | undefined;
	let cwd = ".";
	let projectTrusted = false;

	pi.registerFlag("preset", {
		description: "Preset to activate (collection/role)",
		type: "string",
	});

	// ── helpers ─────────────────────────────────────────

	function getPolicySnapshot(): ToolPolicySnapshot {
		let snapshot: ToolPolicySnapshot | undefined;
		pi.events.emit("dotfiles:tool-policy:snapshot", (value: ToolPolicySnapshot) => {
			snapshot = value;
		});
		return snapshot ?? {
			baseTools: pi.getActiveTools(),
			permissionProfile: "safe",
		};
	}

	function allPaths(): string[] {
		const paths: string[] = [];
		for (const [col, roles] of Object.entries(presets)) {
			for (const role of Object.keys(roles)) {
				paths.push(`${col}/${role}`);
			}
		}
		return paths;
	}

	function resolve(path: string): { collection: string; role: string; def: RoleDef } | undefined {
		const [col, role] = path.split("/");
		if (!col || !role) return undefined;
		const def = presets[col]?.[role];
		if (!def) return undefined;
		return { collection: col, role, def };
	}

	function displayName(): string {
		if (!active) return "";
		return `${active.collection}/${active.role}`;
	}

	// ── apply / clear ─────────────────────────────────

	async function applyPreset(collection: string, role: string, def: RoleDef, ctx: ExtensionContext): Promise<void> {
		if (!active && !originalState) {
			const snapshot = getPolicySnapshot();
			originalTools = snapshot.baseTools;
			originalState = {
				model: ctx.model ? { provider: ctx.model.provider, id: ctx.model.id } : undefined,
				thinkingLevel: pi.getThinkingLevel(),
				permissions: snapshot.permissionProfile,
			};
		}

		if (def.provider && def.model) {
			const model = ctx.modelRegistry.find(def.provider, def.model);
			if (model) {
				const ok = await pi.setModel(model);
				if (!ok) ctx.ui.notify(`No API key for ${def.provider}/${def.model}`, "warning");
			} else {
				ctx.ui.notify(`Model ${def.provider}/${def.model} not found`, "warning");
			}
		}

		if (def.thinkingLevel) pi.setThinkingLevel(def.thinkingLevel);

		const allNames = pi.getAllTools().map((tool) => tool.name);
		const validTools = def.tools?.filter((name) => allNames.includes(name));
		const invalidTools = def.tools?.filter((name) => !allNames.includes(name)) ?? [];
		if (invalidTools.length > 0) {
			ctx.ui.notify(`Unknown preset tools: ${invalidTools.join(", ")}`, "warning");
		}
		pi.events.emit("dotfiles:tool-policy:update", {
			update: {
				presetTools: def.tools ? validTools : null,
				permissionProfile: def.permissions,
			},
			ctx,
		});

		if (def.skills?.length) {
			const parts: string[] = [];
			for (const name of def.skills) {
				const content = loadSkillContent(name, cwd, projectTrusted);
				if (content) {
					parts.push(`<skill name="${name}">\n${content}\n</skill>`);
				}
			}
			loadedSkillContent = parts.length ? parts.join("\n\n") : undefined;
		} else {
			loadedSkillContent = undefined;
		}

		active = { collection, role, def };
		updateStatus(ctx);
		persist();
	}

	async function clearPreset(ctx: ExtensionContext): Promise<void> {
		active = undefined;
		loadedSkillContent = undefined;
		if (originalState) {
			if (originalState.model) {
				const model = ctx.modelRegistry.find(originalState.model.provider, originalState.model.id);
				if (model) await pi.setModel(model);
			}
			pi.setThinkingLevel(originalState.thinkingLevel);
			pi.events.emit("dotfiles:tool-policy:update", {
				update: {
					baseTools: originalTools ?? getPolicySnapshot().baseTools,
					presetTools: null,
					permissionProfile: originalState.permissions,
				},
				ctx,
			});
		} else {
			pi.events.emit("dotfiles:tool-policy:update", {
				update: { presetTools: null },
			});
		}
		originalState = undefined;
		originalTools = undefined;
		updateStatus(ctx);
		persist();
		ctx.ui.notify("Preset cleared, defaults restored", "info");
	}

	function persist() {
		pi.appendEntry(
			"preset-state",
			active ? { path: displayName(), originalState } : { path: undefined },
		);
	}

	function updateStatus(ctx: ExtensionContext) {
		if (active) {
			ctx.ui.setStatus("preset", ctx.ui.theme.fg("accent", displayName()));
		} else {
			ctx.ui.setStatus("preset", undefined);
		}
	}

	// ── pickers ───────────────────────────────────────

	async function pickFromList<T extends string>(
		ctx: ExtensionContext,
		title: string,
		items: SelectItem[],
	): Promise<T | null> {
		return ctx.ui.custom<T | null>((tui, theme, _kb, done) => {
			const container = new Container();
			container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
			container.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 0));

			const selectList = new SelectList(items, Math.min(items.length, 15), {
				selectedPrefix: (t) => theme.fg("accent", t),
				selectedText: (t) => theme.fg("accent", t),
				description: (t) => theme.fg("muted", t),
				scrollInfo: (t) => theme.fg("dim", t),
				noMatch: (t) => theme.fg("warning", t),
			});
			selectList.onSelect = (item) => done(item.value as T);
			selectList.onCancel = () => done(null);
			container.addChild(selectList);

			container.addChild(new Text(theme.fg("dim", "↑↓ navigate · type to filter · enter select · esc cancel"), 1, 0));
			container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

			return {
				render: (w) => container.render(w),
				invalidate: () => container.invalidate(),
				handleInput: (d) => { selectList.handleInput(d); tui.requestRender(); },
			};
		});
	}

	async function pickCollection(ctx: ExtensionContext): Promise<string | null> {
		const collections = Object.keys(presets);
		if (!collections.length) {
			ctx.ui.notify(`No presets. Add them to ${join(getAgentDir(), "presets.json")}`, "warning");
			return null;
		}

		const items: SelectItem[] = collections.map((col) => {
			const roles = Object.keys(presets[col]);
			const isActive = active?.collection === col;
			return {
				value: col,
				label: isActive ? `● ${col}` : `  ${col}`,
				description: `${roles.length} roles: ${roles.join(", ")}`,
			};
		});

		return pickFromList(ctx, "Select Collection", items);
	}

	async function pickRole(ctx: ExtensionContext, collection: string): Promise<string | null> {
		const roles = presets[collection];
		if (!roles) return null;

		const items: SelectItem[] = Object.entries(roles).map(([name, def]) => {
			const isActive = active?.collection === collection && active?.role === name;
			const parts: string[] = [];
			if (def.provider && def.model) parts.push(`${def.model}`);
			if (def.thinkingLevel) parts.push(`thinking:${def.thinkingLevel}`);
			if (def.permissions) parts.push(`perm:${def.permissions}`);
			if (def.skills?.length) parts.push(`${def.skills.length} skills`);

			return {
				value: name,
				label: isActive ? `● ${def.label ?? name}` : `  ${def.label ?? name}`,
				description: def.description ?? parts.join(" · "),
			};
		});

		items.push({
			value: "(back)",
			label: "  ← back",
			description: "Return to collection picker",
		});

		return pickFromList(ctx, `${collection} — Select Role`, items);
	}

	async function showPicker(ctx: ExtensionContext, startCollection?: string): Promise<void> {
		let collection = startCollection;

		while (true) {
			if (!collection) {
				const selectedCollection = await pickCollection(ctx);
				if (!selectedCollection) return;
				collection = selectedCollection;
			}

			const role = await pickRole(ctx, collection);
			if (!role) return;

			if (role === "(back)") {
				collection = undefined;
				continue;
			}

			const def = presets[collection]?.[role];
			if (def) {
				await applyPreset(collection, role, def, ctx);
				ctx.ui.notify(`${collection}/${role} activated`, "info");
			}
			return;
		}
	}

	// ── cycling ───────────────────────────────────────

	async function cycle(ctx: ExtensionContext) {
		const paths = allPaths();
		if (!paths.length) return;

		const list = [...paths, "(none)"];
		const cur = active ? displayName() : "(none)";
		const idx = list.indexOf(cur);
		const next = list[(idx + 1) % list.length];

		if (next === "(none)") { await clearPreset(ctx); return; }

		const resolved = resolve(next);
		if (resolved) {
			await applyPreset(resolved.collection, resolved.role, resolved.def, ctx);
			ctx.ui.notify(`${next} activated`, "info");
		}
	}

	// ── commands & shortcuts ──────────────────────────

	pi.registerCommand("preset", {
		description: "Switch agent preset (collection/role)",
		getArgumentCompletions: (prefix) => {
			const items = [
				...allPaths(),
				...Object.keys(presets),
				"off",
			].filter((n) => n.startsWith(prefix));
			return items.length ? items.map((n) => ({ value: n, label: n })) : null;
		},
		handler: async (args, ctx) => {
			const sub = args.trim();

			if (!sub) {
				await showPicker(ctx);
				return;
			}

			if (sub === "off" || sub === "none" || sub === "clear") {
				await clearPreset(ctx);
				return;
			}

			// direct path: "openai/orchestrator"
			if (sub.includes("/")) {
				const resolved = resolve(sub);
				if (!resolved) {
					ctx.ui.notify(`Unknown preset "${sub}"`, "error");
					return;
				}
				await applyPreset(resolved.collection, resolved.role, resolved.def, ctx);
				ctx.ui.notify(`${sub} activated`, "info");
				return;
			}

			// collection name only: show role picker
			if (presets[sub]) {
				await showPicker(ctx, sub);
				return;
			}

			ctx.ui.notify(`Unknown collection or preset "${sub}". Available: ${Object.keys(presets).join(", ")}`, "error");
		},
	});

	pi.registerShortcut(Key.ctrlShift("u"), {
		description: "Cycle presets",
		handler: async (ctx) => cycle(ctx),
	});

	// ── system prompt injection ─────────────────────

	pi.on("before_agent_start", async (event) => {
		const parts: string[] = [];

		if (active) {
			const roleLabel = active.def.label ?? active.role;
			parts.push(`[PRESET: ${active.collection}/${active.role} — ${roleLabel}]`);
			if (active.def.description) parts.push(active.def.description);
		}

		if (loadedSkillContent) {
			parts.push(`<preset_skills>\nThe following skills are proactively loaded. Follow their instructions.\n\n${loadedSkillContent}\n</preset_skills>`);
		}

		if (active?.def.instructions) {
			parts.push(active.def.instructions);
		}

		if (parts.length > 0) {
			return {
				systemPrompt: `${event.systemPrompt}\n\n${parts.join("\n\n")}`,
			};
		}
	});

	// ── session lifecycle ───────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		cwd = ctx.cwd;
		projectTrusted = ctx.isProjectTrusted();
		presets = loadPresets(cwd, projectTrusted);

		const flag = pi.getFlag("preset");
		if (typeof flag === "string" && flag) {
			const resolved = resolve(flag);
			if (resolved) {
				await applyPreset(resolved.collection, resolved.role, resolved.def, ctx);
			} else if (presets[flag]) {
				// collection only — pick first role
				const roles = Object.entries(presets[flag]);
				if (roles.length) {
					await applyPreset(flag, roles[0][0], roles[0][1], ctx);
				}
			} else {
				ctx.ui.notify(`Unknown preset "${flag}"`, "warning");
			}
		}

		if (!flag) {
			const entries = ctx.sessionManager.getEntries();
			const saved = entries
				.filter((e: { type: string; customType?: string }) =>
					e.type === "custom" && e.customType === "preset-state")
				.pop() as { data?: { path?: string; originalState?: OriginalState } } | undefined;

			if (saved?.data?.path) {
				const resolved = resolve(saved.data.path);
				if (resolved) {
					originalState = saved.data.originalState;
					originalTools = getPolicySnapshot().baseTools;
					await applyPreset(resolved.collection, resolved.role, resolved.def, ctx);
				}
			}
		}

		updateStatus(ctx);
	});
}
