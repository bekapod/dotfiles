import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const run = promisify(execFile);

type Pane = { pane_id?: string | number; cwd?: string };

function parsePanes(output: string): Pane[] {
	const payload = JSON.parse(output) as { result?: { panes?: Pane[] } };
	return payload.result?.panes ?? [];
}

export default function herdrExtension(pi: ExtensionAPI) {
	pi.registerCommand("herdr", {
		description: "Start a fresh Pi agent in a Herdr pane: /herdr <prompt>",
		handler: async (args, ctx) => {
			const prompt = args.trim();
			if (!prompt) {
				ctx.ui.notify("Usage: /herdr <prompt for the new agent>", "error");
				return;
			}

			try {
				const cwd = resolve(ctx.cwd);
				const before = parsePanes((await run("herdr", ["pane", "list"], { cwd })).stdout);
				await run("herdr", ["pane", "split", "--current", "--direction", "right", "--cwd", cwd, "--no-focus"], { cwd });
				const after = parsePanes((await run("herdr", ["pane", "list"], { cwd })).stdout);
				const existing = new Set(before.map((pane) => String(pane.pane_id)));
				const panes = after.filter(
					(pane) => !existing.has(String(pane.pane_id)) && pane.cwd === cwd && pane.pane_id !== undefined,
				);

				if (panes.length !== 1) {
					throw new Error(`expected one new Herdr pane for ${cwd}, found ${panes.length}`);
				}

				const paneId = String(panes[0].pane_id);
				await run("herdr", ["pane", "run", paneId, "pi", "--no-session", "--approve", prompt], { cwd });
				ctx.ui.notify(`Started agent in Herdr pane ${paneId}`, "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});
}
