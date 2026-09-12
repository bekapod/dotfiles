import { execFile } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const run = promisify(execFile);
const CLONES_ROOT = join(homedir(), "agent-clones");
const HANDOFF_PLAN = ".gondolin-handoff-plan.md";
const HANDOFF_REPORT = ".gondolin-handoff-report.md";

type Pane = { pane_id?: string | number; cwd?: string; agent?: string };

function parsePanes(output: string): Pane[] {
	const payload = JSON.parse(output) as { result?: { panes?: Pane[] } };
	return payload.result?.panes ?? [];
}

function shellQuote(value: string): string {
	return `'${value.replaceAll("'", "'\\''")}'`;
}

async function startPiPane(cwd: string, args: string[], env: Record<string, string> = {}, label?: string): Promise<string> {
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
	const command = [
		...Object.entries(env).map(([key, value]) => `${key}=${shellQuote(value)}`),
		"pi",
		...args.map(shellQuote),
	].join(" ");
	await run("herdr", ["pane", "run", paneId, command], { cwd });
	if (label) await run("herdr", ["pane", "rename", paneId, label], { cwd });
	return paneId;
}

function cloneName(branch: string): string {
	return branch.replace(/[^A-Za-z0-9._-]+/g, "-");
}

async function git(cwd: string, args: string[]): Promise<string> {
	return (await run("git", args, { cwd })).stdout.trim();
}

function hasChangesOtherThanPlan(status: string, source: string, planPath: string): boolean {
	const planInSource = relative(source, planPath);
	const allowedPlanStatus = `?? ${planInSource}`;
	return status.split("\n").some((line) => {
		if (!line) return false;
		if (line === allowedPlanStatus) return false;
		const untrackedPath = line.startsWith("?? ") ? line.slice(3) : "";
		return !(untrackedPath.startsWith("plans/") && /\.mdx?$/.test(untrackedPath));
	});
}

async function taskWorkspace(cwd: string, branch: string): Promise<string> {
	const primary = await git(cwd, ["rev-parse", "--show-toplevel"]);
	const workspace = join(CLONES_ROOT, basename(primary), cloneName(branch));
	if (!existsSync(workspace)) throw new Error(`task workspace not found: ${workspace}`);
	return workspace;
}

function workspaceRepos(workspace: string): string[] {
	return readdirSync(workspace, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(join(workspace, entry.name, ".git")))
		.map((entry) => entry.name)
		.sort();
}

async function taskRepo(cwd: string, branch: string, repoName?: string): Promise<string> {
	const workspace = await taskWorkspace(cwd, branch);
	const repos = workspaceRepos(workspace);
	if (!repoName && repos.length !== 1) {
		throw new Error(`task has multiple repositories; specify one: ${repos.join(", ")}`);
	}
	const name = repoName ?? repos[0];
	if (!name || !repos.includes(name)) {
		throw new Error(`task repository not found: ${name ?? "(none)"}. Available: ${repos.join(", ")}`);
	}
	return join(workspace, name);
}

function taskCommandArgs(args: string): { branch: string; repoName?: string } | undefined {
	const [branch, repoName, extra] = args.trim().split(/\s+/);
	if (!branch || extra) return undefined;
	return { branch, repoName };
}

function taskRoot(cwd: string): Promise<string> {
	return git(cwd, ["rev-parse", "--show-toplevel"]).then((primary) => join(CLONES_ROOT, basename(primary)));
}

const CONVENTIONAL_COMMIT_SUBJECT = /^(?:feat|fix|docs|style|refactor|perf|test|build|ci|chore)(?:\([^()\r\n]+\))?!?: .+$/;
const COMMIT_MSG_HOOK = `#!/bin/sh
subject=$(sed -n '1p' "$1")
if ! printf '%s\\n' "$subject" | grep -Eq '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\\([^()[:cntrl:]]+\\))?!?: .+$'; then
	printf '%s\\n' "Invalid commit subject: $subject" >&2
	printf '%s\\n' 'Use type(scope)!: description, with type one of feat, fix, docs, style, refactor, perf, test, build, ci, or chore.' >&2
	exit 1
fi
`;

type PullRequestDetails = Record<"summary" | "changes" | "testing" | "limitations", string>;

function isConventionalCommitSubject(subject: string): boolean {
	return CONVENTIONAL_COMMIT_SUBJECT.test(subject);
}

function installCommitMsgHook(repo: string): string {
	const hooks = join(repo, ".git", "gondolin-hooks");
	mkdirSync(hooks, { recursive: true });
	const hook = join(hooks, "commit-msg");
	writeFileSync(hook, COMMIT_MSG_HOOK, "utf8");
	chmodSync(hook, 0o755);
	return hooks;
}

function reportSections(report: string): Map<string, string> {
	const headings = [...report.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)];
	const sections = new Map<string, string>();
	for (let index = 0; index < headings.length; index++) {
		const heading = headings[index];
		const start = (heading.index ?? 0) + heading[0].length;
		const end = headings[index + 1]?.index ?? report.length;
		sections.set(heading[1].trim().toLowerCase(), report.slice(start, end).trim());
	}
	return sections;
}

function reportSection(sections: Map<string, string>, names: string[]): string {
	for (const name of names) {
		const content = sections.get(name);
		if (content) return content;
	}
	return "";
}

function reportForRepository(report: string, repository: string): string | undefined {
	const sections = [...report.matchAll(/^## Repository:\s*(.+?)\s*$/gim)];
	const section = sections.find((heading) => heading[1].trim().toLowerCase() === repository.toLowerCase());
	if (!section) return undefined;
	const start = (section.index ?? 0) + section[0].length;
	const next = sections.find((heading) => (heading.index ?? 0) > (section.index ?? 0));
	return report.slice(start, next?.index ?? report.length);
}

function pullRequestDetails(report: string, repository: string): PullRequestDetails {
	const repositoryReport = reportForRepository(report, repository);
	if (!repositoryReport) {
		throw new Error(`handoff report has no \"## Repository: ${repository}\" section`);
	}
	const sections = reportSections(repositoryReport);
	const commits = reportSection(sections, ["commit list", "commits"]);
	const files = reportSection(sections, ["changed files", "files changed"]);
	return {
		summary: reportSection(sections, ["pr summary", "summary"]) || "See implementation details below.",
		changes: [commits, files].filter(Boolean).join("\n\n") || "No changed files reported.",
		testing: reportSection(sections, ["verification commands and results", "verification", "validation", "testing"]) || "No verification results reported.",
		limitations: reportSection(sections, ["limitations"]) || "None reported.",
	};
}

function hasSectionContent(content: string): boolean {
	return Boolean(content.replace(/<!--[\s\S]*?-->/g, "").replace(/[\[\]_\-\s]/g, ""));
}

function detailForTemplateHeading(heading: string, details: PullRequestDetails): string | undefined {
	const normalized = heading.toLowerCase();
	if (normalized.includes("summary") || normalized.includes("description")) return details.summary;
	if (normalized.includes("change")) return details.changes;
	if (normalized.includes("test") || normalized.includes("verification") || normalized.includes("validation")) return details.testing;
	if (normalized.includes("limitation") || normalized.includes("risk")) return details.limitations;
}

function implementationDetails(details: PullRequestDetails): string {
	return [
		"## Implementation details",
		"",
		"### Summary",
		details.summary,
		"",
		"### Changes",
		details.changes,
		"",
		"### Testing",
		details.testing,
		"",
		"### Limitations",
		details.limitations,
	].join("\n");
}

function createPullRequestBody(template: string | undefined, details: PullRequestDetails): string {
	if (!template) return implementationDetails(details);
	const headings = [...template.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)];
	let recognized = false;
	let body = template;
	for (let index = headings.length - 1; index >= 0; index--) {
		const heading = headings[index];
		const detail = detailForTemplateHeading(heading[1], details);
		if (!detail) continue;
		recognized = true;
		const contentStart = (heading.index ?? 0) + heading[0].length;
		const contentEnd = headings[index + 1]?.index ?? template.length;
		const content = template.slice(contentStart, contentEnd);
		if (!hasSectionContent(content)) body = `${body.slice(0, contentStart)}\n\n${detail}\n${body.slice(contentEnd)}`;
	}
	return recognized ? body.trim() : `${template.trim()}\n\n${implementationDetails(details)}`.trim();
}

function pullRequestTemplate(repo: string): string | undefined {
	const candidates = [
		join(repo, ".github", "pull_request_template.md"),
		join(repo, ".github", "PULL_REQUEST_TEMPLATE.md"),
		join(repo, "docs", "pull_request_template.md"),
		join(repo, "docs", "PULL_REQUEST_TEMPLATE.md"),
		join(repo, "pull_request_template.md"),
		join(repo, "PULL_REQUEST_TEMPLATE.md"),
	];
	const template = candidates.find((candidate) => existsSync(candidate));
	if (template) return template;

	for (const directory of [join(repo, ".github", "PULL_REQUEST_TEMPLATE"), join(repo, ".github", "pull_request_template")]) {
		if (!existsSync(directory)) continue;
		const templates = readdirSync(directory)
			.filter((file) => /\.md$/i.test(file))
			.sort();
		if (templates.length === 1) return join(directory, templates[0]);
		if (templates.length > 1) throw new Error(`multiple PR templates found in ${directory}; use a root template file`);
	}
}

async function sendPaneMessage(workspace: string, message: string): Promise<boolean> {
	const panes = parsePanes((await run("herdr", ["pane", "list"], { cwd: workspace })).stdout);
	const pane = panes.find(
		(candidate) => candidate.cwd === workspace && candidate.agent === "pi" && candidate.pane_id !== undefined,
	);
	if (!pane) return false;
	const paneId = String(pane.pane_id);
	await run("herdr", ["pane", "send-text", paneId, message], { cwd: workspace });
	await run("herdr", ["pane", "send-keys", paneId, "ENTER"], { cwd: workspace });
	return true;
}

const IMPLEMENT_PROMPT = [
	"Implement the approved plan in .gondolin-handoff-plan.md. Read it first.",
	"The sibling directories are separate repositories. Work only in this task workspace.",
	"Use a Conventional Commit subject for every commit: type(scope)!: description, with type one of feat, fix, docs, style, refactor, perf, test, build, ci, or chore.",
	"Run the relevant checks available locally. After checks pass, make small atomic commits that keep each code change together with its tests in each repository.",
	"Then write .gondolin-handoff-report.md in the task workspace root, not inside a repository. It must use this exact per-repository structure for every repository with commits: ## Repository: <repository directory name>, followed by ### PR summary, ### Verification commands and results, ### Limitations, ### Commit list, and ### Changed files. Each repository section must describe only that repository: its PR summary must not mention sibling repositories, and its verification section must list only commands run for that repository. Include relevant details under every heading.",
].join(" ");

async function startImplementationPane(destination: string, image: string, model: string, label: string): Promise<string> {
	return startPiPane(destination, [
		"--no-session", "--no-extensions", "-e", join(homedir(), ".pi", "gondolin"),
		"--gondolin-image", image, "--model", model, "--no-skills", "--skill", join(homedir(), ".agents", "skills"),
		"--no-prompt-templates", "--no-themes", "--no-context-files", "--no-approve", IMPLEMENT_PROMPT,
	], { GONDOLIN_IMAGE: image }, label);
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
				const paneId = await startPiPane(cwd, ["--no-session", "--approve", prompt]);
				ctx.ui.notify(`Started agent in Herdr pane ${paneId}`, "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("gondolin-review", {
		description: "Review a Gondolin task repository: /gondolin-review <branch> [repo]",
		handler: async (args, ctx) => {
			const input = taskCommandArgs(args);
			if (!input) {
				ctx.ui.notify("Usage: /gondolin-review <branch> [repo]", "error");
				return;
			}
			try {
				const repo = await taskRepo(ctx.cwd, input.branch, input.repoName);
				const workspace = dirname(repo);
				const result = await run("plannotator", ["review", "--git", "--base", "main", "--json"], { cwd: repo });
				const review = JSON.parse(result.stdout) as { decision?: string; message?: string };
				if (review.decision === "annotated" && review.message?.trim()) {
					const sent = await sendPaneMessage(workspace, `Plannotator review feedback:\n\n${review.message.trim()}`);
					ctx.ui.notify(
						sent ? "Review feedback sent to the Gondolin agent." : "Review completed, but the Gondolin pane was not found.",
						 sent ? "info" : "warning",
					);
				} else {
					ctx.ui.notify(review.message?.trim() || "Plannotator review approved.", "info");
				}
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("gondolin-report", {
		description: "Show a Gondolin task report: /gondolin-report <branch>",
		handler: async (args, ctx) => {
			const branch = args.trim();
			if (!branch) {
				ctx.ui.notify("Usage: /gondolin-report <branch>", "error");
				return;
			}
			try {
				const workspace = await taskWorkspace(ctx.cwd, branch);
				const reportPath = join(workspace, HANDOFF_REPORT);
				if (!existsSync(reportPath)) throw new Error(`handoff report not found: ${reportPath}`);
				ctx.ui.notify(readFileSync(reportPath, "utf8"), "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("gondolin-push", {
		description: "Push a Gondolin task repository: /gondolin-push <branch> [repo]",
		handler: async (args, ctx) => {
			const input = taskCommandArgs(args);
			if (!input) {
				ctx.ui.notify("Usage: /gondolin-push <branch> [repo]", "error");
				return;
			}
			try {
				const repo = await taskRepo(ctx.cwd, input.branch, input.repoName);
				await git(repo, ["push", "--set-upstream", "origin", input.branch]);
				ctx.ui.notify(`Pushed ${input.branch} from ${basename(repo)} to origin.`, "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("gondolin-pr", {
		description: "Create a GitHub PR from a Gondolin task repository: /gondolin-pr <branch> [repo]",
		handler: async (args, ctx) => {
			const input = taskCommandArgs(args);
			if (!input) {
				ctx.ui.notify("Usage: /gondolin-pr <branch> [repo]", "error");
				return;
			}
			try {
				const repo = await taskRepo(ctx.cwd, input.branch, input.repoName);
				const subjects = (await git(repo, ["log", "--format=%s", `main..${input.branch}`]))
					.split("\n")
					.filter(Boolean);
				const invalidSubjects = subjects.filter((subject) => !isConventionalCommitSubject(subject));
				if (invalidSubjects.length) {
					throw new Error(`branch has non-Conventional Commit subjects:\n${invalidSubjects.join("\n")}`);
				}
				const title = await git(repo, ["log", "-1", "--format=%s", input.branch]);
				if (!isConventionalCommitSubject(title)) throw new Error(`branch head is not a Conventional Commit: ${title}`);
				const reportPath = join(dirname(repo), HANDOFF_REPORT);
				if (!existsSync(reportPath)) throw new Error(`handoff report not found: ${reportPath}`);
				const details = pullRequestDetails(readFileSync(reportPath, "utf8"), basename(repo));
				const template = pullRequestTemplate(repo);
				const temporaryDirectory = mkdtempSync(join(tmpdir(), "gondolin-pr-"));
				const bodyPath = join(temporaryDirectory, "body.md");
				try {
					writeFileSync(bodyPath, createPullRequestBody(template && readFileSync(template, "utf8"), details), "utf8");
					await git(repo, ["push", "--set-upstream", "origin", input.branch]);
					const result = await run("gh", ["pr", "create", "--base", "main", "--head", input.branch, "--title", title, "--body-file", bodyPath], { cwd: repo });
					ctx.ui.notify((result.stdout || result.stderr).trim() || "Pull request created.", "info");
				} finally {
					rmSync(temporaryDirectory, { recursive: true, force: true });
				}
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	let pendingPlan: { branch: string; planPath: string; handoffArgs: string } | undefined;

	pi.on("agent_settled", async (_event, ctx) => {
		if (!pendingPlan || !existsSync(pendingPlan.planPath)) return;
		const plan = pendingPlan;
		pendingPlan = undefined;
		try {
			const result = await run("plannotator", ["annotate", plan.planPath, "--gate", "--json"], { cwd: ctx.cwd });
			const review = JSON.parse(result.stdout) as { decision?: string; feedback?: string };
			if (review.decision === "approved") {
				const notes = review.feedback?.trim();
				ctx.ui.notify(`${notes ? `${notes}\n\n` : ""}Plan approved. Run this when ready:\n/gondolin-handoff ${plan.handoffArgs}`, "info");
				return;
			}
			const feedback = review.feedback?.trim();
			if (review.decision === "annotated" && feedback) {
				pendingPlan = plan;
				pi.sendUserMessage(`Revise ${plan.planPath} to address this Plannotator feedback. Keep it implementation-ready, resolve every decision, and leave no open questions.\n\n${feedback}`, { deliverAs: "followUp" });
			} else {
				ctx.ui.notify(feedback || "Plan review was not approved.", "warning");
			}
		} catch (error) {
			ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
		}
	});

	pi.registerCommand("gondolin-plan", {
		description: "Write, review, and prepare a Gondolin handoff plan",
		handler: async (args, ctx) => {
			const [branch, ...inputs] = args.trim().split(/\s+/);
			if (!branch) {
				ctx.ui.notify("Usage: /gondolin-plan <branch> [peer-repo-path ...] [--plan path]", "error");
				return;
			}
			let planInput = join("plans", `${cloneName(branch)}.md`);
			const peers: string[] = [];
			for (let index = 0; index < inputs.length; index++) {
				if (inputs[index] === "--plan") {
					const value = inputs[++index];
					if (!value) {
						ctx.ui.notify("Missing value for --plan", "error");
						return;
					}
					planInput = value;
				} else if (inputs[index].startsWith("--")) {
					ctx.ui.notify(`Unknown option: ${inputs[index]}`, "error");
					return;
				} else {
					peers.push(inputs[index]);
				}
			}
			const planPath = resolve(ctx.cwd, planInput);
			mkdirSync(dirname(planPath), { recursive: true });
			const handoffArgs = [branch, planPath, ...peers].join(" ");
			pendingPlan = { branch, planPath, handoffArgs };
			pi.sendUserMessage([
				`Write the Gondolin handoff plan for branch ${branch}.`,
				`First inspect the relevant code and read every relevant principle-* skill before planning.`,
				`Save the complete plan to ${planPath}. Do not implement the plan or modify product code.`,
				`The plan must name the repositories involved, exact files and changes, verification, all decisions needed to execute, and a References section naming the relevant principle-* skills. Resolve uncertainty through investigation and make the decisions. Do not leave open questions, TODOs, alternatives, or decisions for the implementation worker.`,
				`When the file is written, stop so it can be reviewed in Plannotator.`,
			].join("\n"));
		},
	});

	pi.registerCommand("gondolin-list", {
		description: "List Gondolin task workspaces for the current repository",
		handler: async (_args, ctx) => {
			try {
				const root = await taskRoot(ctx.cwd);
				if (!existsSync(root)) {
					ctx.ui.notify("No Gondolin task workspaces found.", "info");
					return;
				}
				const panes = parsePanes((await run("herdr", ["pane", "list"], { cwd: root })).stdout);
				const active = new Set(panes.map((pane) => pane.cwd).filter((cwd): cwd is string => Boolean(cwd)));
				const workspaces = readdirSync(root, { withFileTypes: true })
					.filter((entry) => entry.isDirectory())
					.map((entry) => {
						const workspace = join(root, entry.name);
						return { name: entry.name, workspace, modified: statSync(workspace).mtime };
					})
					.sort((left, right) => right.modified.getTime() - left.modified.getTime());
				const listed = workspaces.map((entry) => {
					const state = active.has(entry.workspace) ? "active" : "inactive";
					const repos = workspaceRepos(entry.workspace).join(", ");
					return `${entry.name}\t${entry.modified.toISOString().slice(0, 10)}\t${state}\t${repos}`;
				});
				ctx.ui.notify(listed.length ? `Gondolin workspaces:\n${listed.join("\n")}` : "No Gondolin task workspaces found.", "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("gondolin-clean", {
		description: "List or remove inactive Gondolin task workspaces: /gondolin-clean [--older-than days] [--delete branch]",
		handler: async (args, ctx) => {
			const inputs = args.trim() ? args.trim().split(/\s+/) : [];
			let olderThan = 14;
			let deleteBranch: string | undefined;
			for (let index = 0; index < inputs.length; index++) {
				if (inputs[index] === "--older-than") {
					olderThan = Number(inputs[++index]);
				} else if (inputs[index] === "--delete") {
					deleteBranch = inputs[++index];
				} else {
					ctx.ui.notify(`Unknown option: ${inputs[index]}`, "error");
					return;
				}
			}
			if (!Number.isInteger(olderThan) || olderThan < 0 || (deleteBranch !== undefined && !deleteBranch)) {
				ctx.ui.notify("Usage: /gondolin-clean [--older-than days] [--delete branch]", "error");
				return;
			}
			try {
				const root = await taskRoot(ctx.cwd);
				if (!existsSync(root)) {
					ctx.ui.notify("No Gondolin task workspaces found.", "info");
					return;
				}
				const panes = parsePanes((await run("herdr", ["pane", "list"], { cwd: root })).stdout);
				const active = new Set(panes.map((pane) => pane.cwd).filter((cwd): cwd is string => Boolean(cwd)));
				if (deleteBranch) {
					const workspace = join(root, cloneName(deleteBranch));
					if (!existsSync(workspace)) throw new Error(`task workspace not found: ${workspace}`);
					if (active.has(workspace)) throw new Error(`task workspace is active in a Herdr pane: ${workspace}`);
					rmSync(workspace, { recursive: true, force: true });
					ctx.ui.notify(`Deleted inactive Gondolin workspace: ${workspace}`, "info");
					return;
				}
				const threshold = Date.now() - olderThan * 24 * 60 * 60 * 1000;
				const workspaces = readdirSync(root, { withFileTypes: true })
					.filter((entry) => entry.isDirectory())
					.map((entry) => {
						const workspace = join(root, entry.name);
						return { name: entry.name, workspace, modified: statSync(workspace).mtime };
					})
					.filter((entry) => entry.modified.getTime() < threshold)
					.sort((left, right) => left.modified.getTime() - right.modified.getTime());
				const listed = workspaces.map((entry) => {
					const state = active.has(entry.workspace) ? "active" : "inactive";
					return `${entry.name}\t${entry.modified.toISOString().slice(0, 10)}\t${state}`;
				});
				const message = listed.length
					? `Stale Gondolin workspaces:\n${listed.join("\n")}\n\nDelete one with /gondolin-clean --delete <branch>.`
					: "No stale Gondolin workspaces found.";
				ctx.ui.notify(message, "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("gondolin-resume", {
		description: "Resume an existing Gondolin task workspace: /gondolin-resume <branch> [--image standard|gbdk] [--model provider/model]",
		handler: async (args, ctx) => {
			const [branch, ...inputs] = args.trim().split(/\s+/);
			if (!branch) {
				ctx.ui.notify("Usage: /gondolin-resume <branch> [--image standard|gbdk] [--model provider/model]", "error");
				return;
			}
			let image = "standard";
			let model = "openai-codex/gpt-5.6-luna";
			for (let index = 0; index < inputs.length; index++) {
				if (inputs[index] === "--image") image = inputs[++index] ?? "";
				else if (inputs[index] === "--model") model = inputs[++index] ?? "";
				else {
					ctx.ui.notify(`Unknown option: ${inputs[index]}`, "error");
					return;
				}
			}
			if ((image !== "standard" && image !== "gbdk") || !model) {
				ctx.ui.notify("Use a valid image and model", "error");
				return;
			}
			try {
				const workspace = await taskWorkspace(ctx.cwd, branch);
				const paneId = await startImplementationPane(workspace, image, model, branch);
				ctx.ui.notify(`Resumed Gondolin agent in Herdr pane ${paneId}`, "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("gondolin-handoff", {
		description: "Clone the current repo and optional peers, then start a network-isolated Pi implementation",
		handler: async (args, ctx) => {
			const [branch, planInput, ...inputs] = args.trim().split(/\s+/);
			if (!branch || !planInput) {
				ctx.ui.notify("Usage: /gondolin-handoff <branch> <plan-file> [peer-repo-path ...] [--image standard|gbdk] [--model provider/model]", "error");
				return;
			}
			let image = "standard";
			let model = "openai-codex/gpt-5.6-luna";
			const peerInputs: string[] = [];
			for (let index = 0; index < inputs.length; index++) {
				if (inputs[index] === "--image") {
					image = inputs[++index] ?? "";
				} else if (inputs[index] === "--model") {
					model = inputs[++index] ?? "";
				} else if (inputs[index].startsWith("--")) {
					ctx.ui.notify(`Unknown option: ${inputs[index]}`, "error");
					return;
				} else {
					peerInputs.push(inputs[index]);
				}
			}
			if (image !== "standard" && image !== "gbdk") {
				ctx.ui.notify("Image must be standard or gbdk", "error");
				return;
			}
			if (model === "") {
				ctx.ui.notify("Model must be a provider/model value", "error");
				return;
			}

			try {
				const primary = await git(ctx.cwd, ["rev-parse", "--show-toplevel"]);
				const peers = await Promise.all(
					peerInputs.map((input) => git(resolve(ctx.cwd, input), ["rev-parse", "--show-toplevel"])),
				);
				const sources = [...new Set([primary, ...peers])];
				const names = sources.map((source) => basename(source));
				if (new Set(names).size !== names.length) {
					throw new Error("repositories with the same directory name need separate handoffs");
				}
				const planPath = resolve(ctx.cwd, planInput);
				if (!existsSync(planPath)) throw new Error(`plan file not found: ${planPath}`);
				readFileSync(planPath, "utf8");
				for (const source of sources) {
					const status = await git(source, ["status", "--porcelain", "--untracked-files=all"]);
					if (hasChangesOtherThanPlan(status, source, planPath)) {
						throw new Error(`source checkout has uncommitted changes: ${source}`);
					}
				}
				await git(primary, ["check-ref-format", "--branch", branch]);

				const destination = join(CLONES_ROOT, basename(primary), cloneName(branch));
				if (existsSync(destination)) throw new Error(`task workspace already exists: ${destination}`);
				mkdirSync(destination, { recursive: true });
				copyFileSync(planPath, join(destination, HANDOFF_PLAN));
				for (const source of sources) {
					const clone = join(destination, basename(source));
					const origin = await git(source, ["remote", "get-url", "origin"]);
					await run("git", ["clone", "--recurse-submodules", "--no-local", source, clone], { cwd: destination });
					await git(clone, ["remote", "set-url", "origin", origin]);
					await git(clone, ["switch", "-c", branch]);
					const hooks = installCommitMsgHook(clone);
					await git(clone, ["config", "core.hooksPath", hooks]);
				}

				const paneId = await startImplementationPane(destination, image, model, branch);
				ctx.ui.notify(`Started Gondolin agent in Herdr pane ${paneId}: ${destination}`, "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});
}
