import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize, truncateHead } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const LINEAR_ENDPOINT = "https://api.linear.app/graphql";

function isMutation(query: string): boolean {
  return /\bmutation\b/.test(query.replace(/#.*/g, ""));
}

function formatResult(payload: unknown): string {
  const formatted = JSON.stringify(payload, null, 2);
  const truncated = truncateHead(formatted, {
    maxBytes: DEFAULT_MAX_BYTES,
    maxLines: DEFAULT_MAX_LINES,
  });

  if (!truncated.truncated) return truncated.content;

  return `${truncated.content}\n\n[Linear response truncated: ${truncated.outputLines} of ${truncated.totalLines} lines, ${formatSize(truncated.outputBytes)} of ${formatSize(truncated.totalBytes)}.]`;
}

function mutationPreview(query: string, variables: unknown, operationName?: string): string {
  const preview = [
    operationName ? `Operation: ${operationName}` : "Unnamed Linear mutation",
    "",
    query.trim(),
    "",
    "Variables:",
    JSON.stringify(variables ?? {}, null, 2),
  ].join("\n");

  return truncateHead(preview, { maxBytes: 4_000, maxLines: 60 }).content;
}

export default function linearExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "linear_api",
    label: "Linear API",
    description: "Run a GraphQL query or mutation against Linear. Supports issues, projects, milestones, documents, and any other Linear GraphQL API resource.",
    promptSnippet: "Query Linear issues, projects, milestones, documents, and other Linear resources",
    promptGuidelines: [
      "Use linear_api for Linear data instead of web searches.",
      "Use a GraphQL query for reads. Use a mutation only when the user explicitly asks to change Linear, then state what changed.",
      "Keep Linear queries narrow with first, filter, and selected fields. Do not request a whole workspace.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Complete Linear GraphQL query or mutation." }),
      variables: Type.Optional(Type.Record(Type.String(), Type.Unknown(), { description: "GraphQL variables as a JSON object." })),
      operationName: Type.Optional(Type.String({ description: "Optional GraphQL operation name." })),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const apiKey = process.env.LINEAR_API_KEY;
      if (!apiKey) {
        throw new Error("LINEAR_API_KEY is not set. Create a Linear personal API key, export LINEAR_API_KEY, then restart pi.");
      }

      const mutation = isMutation(params.query);
      if (mutation) {
        if (!ctx.hasUI) {
          throw new Error("Linear mutations require interactive confirmation. Run pi interactively.");
        }

        const approved = await ctx.ui.confirm(
          "Change Linear?",
          mutationPreview(params.query, params.variables, params.operationName),
        );
        if (!approved) {
          return {
            content: [{ type: "text", text: "Linear mutation cancelled." }],
            details: { cancelled: true },
          };
        }
      }

      const response = await fetch(LINEAR_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: params.query,
          variables: params.variables,
          operationName: params.operationName,
        }),
        signal,
      });

      const body = await response.text();
      let payload: unknown;
      try {
        payload = JSON.parse(body);
      } catch {
        payload = { errors: [{ message: body || "Linear returned an empty response." }] };
      }

      if (!response.ok) {
        throw new Error(`Linear API returned ${response.status}: ${formatResult(payload)}`);
      }

      const text = formatResult(payload);
      return {
        content: [{ type: "text", text }],
        details: { mutation, status: response.status },
      };
    },
  });

  pi.registerCommand("linear-status", {
    description: "Check whether Linear is configured",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        process.env.LINEAR_API_KEY ? "Linear API key found." : "Set LINEAR_API_KEY, then restart pi.",
        process.env.LINEAR_API_KEY ? "info" : "warning",
      );
    },
  });
}
