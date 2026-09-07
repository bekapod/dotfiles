/**
 * Web Fetch Extension
 *
 * Registers a `web_fetch` tool the LLM can call to retrieve a URL and read it
 * as plain text. HTML is stripped to readable text; other text types are
 * returned as-is. Binary responses are refused.
 *
 * Notes:
 * - Only http(s) URLs are allowed.
 * - Responses are truncated to `maxBytes` (default 100 KB).
 * - Redirects are followed by the platform fetch.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";

const schema = Type.Object({
	url: Type.String({ description: "Absolute http(s) URL to fetch" }),
	maxBytes: Type.Optional(
		Type.Number({
			description: "Max characters of extracted text to return (default 100000)",
		}),
	),
	raw: Type.Optional(
		Type.Boolean({
			description: "Return the raw response body without HTML-to-text stripping",
		}),
	),
});

export type WebFetchInput = Static<typeof schema>;

function htmlToText(html: string): string {
	return html
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
		.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
		.replace(/<!--[\s\S]*?-->/g, " ")
		.replace(/<\/(p|div|section|article|li|tr|h[1-6]|br)>/gi, "\n")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;|&apos;/gi, "'")
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.split("\n")
		.map((line) => line.trim())
		.join("\n")
		.trim();
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "web_fetch",
		label: "Web Fetch",
		description:
			"Fetch an http(s) URL and return its contents as text. HTML is converted to readable text unless `raw` is set. Use for reading docs, pages, or APIs.",
		parameters: schema,
		async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
			const { url, maxBytes = 100_000, raw = false } = params;

			let parsed: URL;
			try {
				parsed = new URL(url);
			} catch {
				return {
					content: [{ type: "text", text: `Invalid URL: ${url}` }],
					details: {},
					isError: true,
				};
			}
			if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
				return {
					content: [
						{ type: "text", text: `Refusing non-http(s) URL: ${parsed.protocol}` },
					],
					details: {},
					isError: true,
				};
			}

			try {
				const res = await fetch(parsed, {
					signal,
					redirect: "follow",
					headers: { "user-agent": "pi-web-fetch/1.0", accept: "text/*, */*" },
				});

				const contentType = res.headers.get("content-type") ?? "";
				const isTextual =
					/text\/|application\/(json|xml|xhtml|javascript|.*\+json|.*\+xml)/i.test(
						contentType,
					) || contentType === "";

				if (!isTextual) {
					return {
						content: [
							{
								type: "text",
								text: `HTTP ${res.status} ${res.statusText}\nUnsupported content-type: ${contentType || "unknown"} (binary). Not fetched as text.`,
							},
						],
						details: { status: res.status, contentType },
						isError: !res.ok,
					};
				}

				const body = await res.text();
				const isHtml = /html/i.test(contentType) || /^\s*<!doctype html|<html/i.test(body);
				let text = raw || !isHtml ? body : htmlToText(body);

				const truncated = text.length > maxBytes;
				if (truncated) text = `${text.slice(0, maxBytes)}\n\n…[truncated at ${maxBytes} chars]`;

				const header = `HTTP ${res.status} ${res.statusText} — ${parsed.href}\ncontent-type: ${contentType || "unknown"}\n\n`;
				return {
					content: [{ type: "text", text: header + text }],
					details: {
						status: res.status,
						url: parsed.href,
						contentType,
						truncated,
						bytes: text.length,
					},
					isError: !res.ok,
				};
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text", text: `Fetch failed: ${message}` }],
					details: {},
					isError: true,
				};
			}
		},
	});
}
