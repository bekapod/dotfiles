/**
 * Handoff Extension
 *
 * Transfer context to a new focused session with a generated summary prompt.
 *
 * /handoff <goal>   — summarise current session and create a new one
 *                     with a ready-to-submit continuation prompt
 *
 * The generated prompt captures: goal, decisions, files touched, and
 * suggested next steps. You can edit it before submitting.
 */

import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { type Message, uuidv7 } from "@earendil-works/pi-ai";
import type { ExtensionAPI, SessionEntry } from "@earendil-works/pi-coding-agent";
import { BorderedLoader, convertToLlm, serializeConversation } from "@earendil-works/pi-coding-agent";

const SYSTEM_PROMPT = `You are a context transfer assistant. Given a conversation and the user's goal for a new session, generate a focused continuation prompt.

Include:
1. Relevant context (decisions made, approaches taken, key findings)
2. Files discussed or modified
3. Current state (what works, what's broken, what's untested)
4. The next task based on the user's goal

Be concise. The new session should be self-contained. Output only the prompt — no preamble.

Format:
## Context
Brief summary of where things stand. Key decisions:
- Decision 1
- Decision 2

Files involved:
- path/to/file1.ts — what was done
- path/to/file2.ts — what was done

## Current state
What works, what doesn't, what's untested.

## Task
Clear description of what to do next.`;

function entryToMessage(entry: SessionEntry): AgentMessage | undefined {
	if (entry.type === "message") return entry.message;
	if (entry.type === "compaction") {
		return {
			role: "compactionSummary",
			summary: entry.summary,
			tokensBefore: entry.tokensBefore,
			timestamp: new Date(entry.timestamp).getTime(),
		};
	}
	return undefined;
}

function getConversationMessages(branch: SessionEntry[]): AgentMessage[] {
	// If compacted, start from last compaction
	let compactionIndex = -1;
	for (let i = branch.length - 1; i >= 0; i--) {
		if (branch[i].type === "compaction") {
			compactionIndex = i;
			break;
		}
	}

	if (compactionIndex < 0) {
		return branch.map(entryToMessage).filter((m) => m !== undefined);
	}

	const compaction = branch[compactionIndex];
	const firstKeptIndex =
		compaction.type === "compaction"
			? branch.findIndex((e) => e.id === compaction.firstKeptEntryId)
			: -1;

	const slice = [
		compaction,
		...(firstKeptIndex >= 0 ? branch.slice(firstKeptIndex, compactionIndex) : []),
		...branch.slice(compactionIndex + 1),
	];
	return slice.map(entryToMessage).filter((m) => m !== undefined);
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("handoff", {
		description: "Transfer context to a new session: /handoff <goal>",
		handler: async (args, ctx) => {
			if (ctx.mode !== "tui") {
				ctx.ui.notify("Handoff requires interactive mode", "error");
				return;
			}
			if (!ctx.model) {
				ctx.ui.notify("No model selected", "error");
				return;
			}

			const goal = args.trim();
			if (!goal) {
				ctx.ui.notify("Usage: /handoff <goal for new session>", "error");
				return;
			}

			const messages = getConversationMessages(ctx.sessionManager.getBranch());
			if (messages.length === 0) {
				ctx.ui.notify("No conversation to hand off", "error");
				return;
			}

			const llmMessages = convertToLlm(messages);
			const conversationText = serializeConversation(llmMessages);
			const parentSession = ctx.sessionManager.getSessionFile();

			// generate the handoff prompt
			const generated = await ctx.ui.custom<string | null>(
				(tui, theme, _kb, done) => {
					const loader = new BorderedLoader(tui, theme, "Generating handoff…");
					loader.onAbort = () => done(null);

					(async () => {
						const userMsg: Message = {
							role: "user",
							content: [
								{
									type: "text",
									text: `## Conversation\n\n${conversationText}\n\n## Goal\n\n${goal}`,
								},
							],
							timestamp: Date.now(),
						};

						const response = await ctx.modelRegistry.complete(
							ctx.model!,
							{ systemPrompt: SYSTEM_PROMPT, messages: [userMsg] },
							{ signal: loader.signal, cacheRetention: "none", sessionId: uuidv7() },
						);

						if (response.stopReason === "aborted") return done(null);

						const text = response.content
							.filter((c): c is { type: "text"; text: string } => c.type === "text")
							.map((c) => c.text)
							.join("\n");
						done(text);
					})().catch(() => done(null));

					return loader;
				},
			);

			if (!generated) {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			// let user review/edit
			const edited = await ctx.ui.editor("Edit handoff prompt", generated);
			if (edited === undefined) {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			const result = await ctx.newSession({
				parentSession: parentSession,
				withSession: async (newCtx) => {
					newCtx.ui.setEditorText(edited);
					newCtx.ui.notify("Handoff ready — review and submit", "info");
				},
			});

			if (result.cancelled) {
				ctx.ui.notify("New session cancelled", "info");
			}
		},
	});
}
