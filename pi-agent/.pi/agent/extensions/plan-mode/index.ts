/**
 * Plan Mode Extension
 *
 * Read-only exploration mode. When active, the agent can only read and
 * analyse code using Pi's structured read-only tools.
 *
 * /plan        — toggle plan mode on/off
 * /plan exec   — exit plan mode and execute the plan with full tool access
 * Ctrl+Alt+P   — toggle shortcut
 *
 * The agent is instructed to produce a numbered "Plan:" section.
 * On /plan exec, those steps become a tracked todo widget.
 */

import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { AssistantMessage, TextContent } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";
import {
	extractTodoItems,
	markCompletedSteps,
	type TodoItem,
} from "./utils.ts";
import { READ_ONLY_TOOL_NAMES } from "../shared/tool-policy.ts";

interface PlanState {
	enabled: boolean;
	todos?: TodoItem[];
	executing?: boolean;
}

function isAssistant(m: AgentMessage): m is AssistantMessage {
	return m.role === "assistant" && Array.isArray(m.content);
}

function textOf(msg: AssistantMessage): string {
	return msg.content
		.filter((b): b is TextContent => b.type === "text")
		.map((b) => b.text)
		.join("\n");
}

export default function (pi: ExtensionAPI) {
	let planOn = false;
	let executing = false;
	let todos: TodoItem[] = [];

	// ── helpers ──────────────────────────────────────────────

	function persist() {
		pi.appendEntry("plan-mode", {
			enabled: planOn,
			todos,
			executing,
		} satisfies PlanState);
	}

	function updateUI(ctx: ExtensionContext) {
		if (executing && todos.length > 0) {
			const done = todos.filter((t) => t.completed).length;
			ctx.ui.setStatus("plan-mode", ctx.ui.theme.fg("accent", `📋 ${done}/${todos.length}`));
			ctx.ui.setWidget(
				"plan-todos",
				todos.map((t) =>
					t.completed
						? ctx.ui.theme.fg("success", "☑ ") +
							ctx.ui.theme.fg("muted", ctx.ui.theme.strikethrough(t.text))
						: ctx.ui.theme.fg("muted", "☐ ") + t.text,
				),
			);
		} else if (planOn) {
			ctx.ui.setStatus("plan-mode", ctx.ui.theme.fg("warning", "⏸ plan"));
			ctx.ui.setWidget("plan-todos", undefined);
		} else {
			ctx.ui.setStatus("plan-mode", undefined);
			ctx.ui.setWidget("plan-todos", undefined);
		}
	}

	function enablePlanTools() {
		pi.events.emit("dotfiles:tool-policy:update", { update: { planMode: true } });
	}

	function restoreTools() {
		pi.events.emit("dotfiles:tool-policy:update", { update: { planMode: false } });
	}

	function toggle(ctx: ExtensionContext) {
		planOn = !planOn;
		executing = false;
		todos = [];
		if (planOn) {
			enablePlanTools();
			ctx.ui.notify("Plan mode ON — write tools disabled", "info");
		} else {
			restoreTools();
			ctx.ui.notify("Plan mode OFF — full access restored", "info");
		}
		updateUI(ctx);
		persist();
	}

	// ── commands & shortcuts ────────────────────────────────

	pi.registerCommand("plan", {
		description: "Toggle plan mode, or '/plan exec' to execute",
		handler: async (args, ctx) => {
			const sub = args.trim().toLowerCase();

			if (sub === "exec" || sub === "execute") {
				if (!planOn && !executing) {
					ctx.ui.notify("Not in plan mode", "error");
					return;
				}
				// Find latest plan from conversation
				const entries = ctx.sessionManager.getBranch();
				for (let i = entries.length - 1; i >= 0; i--) {
					const e = entries[i];
					if (
						e.type === "message" &&
						isAssistant(e.message as AgentMessage)
					) {
						const extracted = extractTodoItems(
							textOf(e.message as AssistantMessage),
						);
						if (extracted.length > 0) {
							todos = extracted;
							break;
						}
					}
				}

				if (todos.length === 0) {
					ctx.ui.notify(
						"No plan found. Ask the agent to create a numbered Plan: section first.",
						"error",
					);
					return;
				}

				planOn = false;
				executing = true;
				restoreTools();
				updateUI(ctx);
				persist();

				const list = todos.map((t) => `${t.step}. ${t.text}`).join("\n");
				pi.sendMessage(
					{
						customType: "plan-mode-execute",
						content: `Execute the plan. After completing each step include [DONE:n].\n\n${list}`,
						display: true,
					},
					{ triggerTurn: true },
				);
				return;
			}

			toggle(ctx);
		},
	});

	pi.registerShortcut(Key.ctrlAlt("p"), {
		description: "Toggle plan mode",
		handler: async (ctx) => toggle(ctx),
	});

	// ── tool gating ─────────────────────────────────────────

	pi.on("tool_call", async (event) => {
		if (!planOn || READ_ONLY_TOOL_NAMES.has(event.toolName)) return;
		return {
			block: true,
			reason: "Plan mode only permits read, grep, find, and ls. Use /plan to disable.",
		};
	});

	// ── context injection ───────────────────────────────────

	pi.on("before_agent_start", async () => {
		if (planOn) {
			return {
				message: {
					customType: "plan-mode-context",
					content: `[PLAN MODE] You are in read-only mode. Only read, grep, find, and ls are available.

Analyse the codebase, then produce a numbered plan under a "Plan:" header:

Plan:
1. First step
2. Second step
...

Do NOT make changes — just describe what you would do.`,
					display: false,
				},
			};
		}

		if (executing && todos.length > 0) {
			const remaining = todos
				.filter((t) => !t.completed)
				.map((t) => `${t.step}. ${t.text}`)
				.join("\n");
			return {
				message: {
					customType: "plan-execution-context",
					content: `[EXECUTING PLAN]\n\nRemaining:\n${remaining}\n\nAfter completing each step include [DONE:n].`,
					display: false,
				},
			};
		}
	});

	// ── progress tracking ───────────────────────────────────

	pi.on("turn_end", async (event, ctx) => {
		if (!executing || todos.length === 0) return;
		if (!isAssistant(event.message)) return;
		if (markCompletedSteps(textOf(event.message), todos) > 0) {
			updateUI(ctx);
			persist();
		}
	});

	pi.on("agent_end", async (_event, ctx) => {
		if (!executing || todos.length === 0) return;
		if (todos.every((t) => t.completed)) {
			pi.sendMessage(
				{
					customType: "plan-complete",
					content: "**Plan complete** ✓",
					display: true,
				},
				{ triggerTurn: false },
			);
			executing = false;
			todos = [];
			updateUI(ctx);
			persist();
		}
	});

	// strip stale plan-mode context messages when not in plan mode
	pi.on("context", async (event) => {
		if (planOn) return;
		return {
			messages: event.messages.filter((m) => {
				const msg = m as AgentMessage & { customType?: string };
				return msg.customType !== "plan-mode-context";
			}),
		};
	});

	// ── session restore ─────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		const entries = ctx.sessionManager.getEntries();
		const saved = entries
			.filter(
				(e: { type: string; customType?: string }) =>
					e.type === "custom" && e.customType === "plan-mode",
			)
			.pop() as { data?: PlanState } | undefined;

		if (saved?.data) {
			planOn = saved.data.enabled ?? false;
			todos = saved.data.todos ?? [];
			executing = saved.data.executing ?? false;
		}

		// rebuild completion state on resume
		if (executing && todos.length > 0) {
			let execIdx = -1;
			for (let i = entries.length - 1; i >= 0; i--) {
				if ((entries[i] as { customType?: string }).customType === "plan-mode-execute") {
					execIdx = i;
					break;
				}
			}
			for (let i = execIdx + 1; i < entries.length; i++) {
				const e = entries[i];
				if (
					e.type === "message" &&
					isAssistant(e.message as AgentMessage)
				) {
					markCompletedSteps(textOf(e.message as AssistantMessage), todos);
				}
			}
		}

		if (planOn) enablePlanTools();
		updateUI(ctx);
	});
}
