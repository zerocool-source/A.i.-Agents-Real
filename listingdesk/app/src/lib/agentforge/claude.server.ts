// The agent brain. Calls the Anthropic Messages API directly with fetch (no
// SDK dependency. keeps the template lockfile untouched). Uses Claude when
// the ANTHROPIC_API_KEY secret is set on the website; otherwise demo mode
// with clearly-labeled canned output so the dashboard stays explorable.
import { env } from "cloudflare:workers";

const MODEL = "claude-opus-4-8";
const API_URL = "https://api.anthropic.com/v1/messages";

function apiKey(override?: string): string | undefined {
  if (override?.trim()) return override.trim();
  return (env as Record<string, unknown>).ANTHROPIC_API_KEY as
    | string
    | undefined;
}

// True when the brain will run live (her stored key or a platform secret).
export function brainIsLive(dbKey?: string): boolean {
  return Boolean(apiKey(dbKey));
}

const COMPANY_SYSTEM = `You are the AI marketing partner behind ListingDesk, Leslie Smith's personal command desk. Leslie is a Keller Williams agent (The Lakes office) serving the Temecula valley in Southern California: Temecula, Murrieta, Menifee, Lake Elsinore, San Jacinto, Moreno Valley, and Hemet.

The signature move: every listing gets a vertical video walkthrough in the first 48 hours. When asked for a walkthrough, produce the full package: a two-second hook, a shot-by-shot filming plan with spoken lines and durations, on-screen captions, post copy with hashtags, and a lead-capture CTA, all under 60 seconds of runtime. Also on the desk: just-listed and open-house post sets, follow-up sequences for sign-ins, buyer-program explainers (builder rate buydowns near 3.99%, CalHFA down payment assistance, Section 8 homeownership), and five-minute lead responses.

Be concrete and actionable. Leslie films on a phone and posts the same day, so keep plans practical. Use markdown. Keep chat answers tight; walkthroughs and sequences can be thorough.`;

interface AnthropicTextBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicTextBlock[];
  stop_reason?: string;
  error?: { type: string; message: string };
}

async function callClaude(
  userContent: string,
  maxTokens: number,
  dbKey?: string,
): Promise<string> {
  const key = apiKey(dbKey);
  if (!key) throw new Error("no api key");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: COMPANY_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userContent }],
    }),
  });

  const data = (await res.json()) as AnthropicResponse;
  if (!res.ok) {
    throw new Error(
      `Anthropic API ${res.status}: ${data.error?.message ?? "unknown error"}`,
    );
  }
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) {
    throw new Error(
      data.stop_reason === "refusal"
        ? "The request was declined by the model's safety system."
        : "Empty response from the model.",
    );
  }
  return text;
}

export async function askBrain(
  question: string,
  context: string,
  dbKey?: string,
): Promise<string> {
  if (!apiKey(dbKey)) return demoChat(question);
  try {
    return await callClaude(
      `Current business state:\n${context}\n\n---\n\n${question}`,
      4096,
      dbKey,
    );
  } catch (err) {
    return `**Agent brain error:** ${err instanceof Error ? err.message : "unknown error"}. Try again in a moment.`;
  }
}

export async function runTaskBrain(
  taskTitle: string,
  taskDescription: string,
  context: string,
  dbKey?: string,
): Promise<string> {
  if (!apiKey(dbKey)) return demoDeliverable(taskTitle, taskDescription);
  try {
    return await callClaude(
      `Current business state:\n${context}\n\n---\n\nExecute this task and return the finished deliverable as a well-structured markdown document. Do not describe what you would do. Produce the actual deliverable.\n\nTask: ${taskTitle}\n\nDetails: ${taskDescription}`,
      8000,
      dbKey,
    );
  } catch (err) {
    return `# ${taskTitle}\n\n**Agent brain error:** ${err instanceof Error ? err.message : "unknown error"}. Re-run the task to try again.`;
  }
}

function demoChat(question: string): string {
  return `**Demo mode**: paste your Anthropic API key under Integrations to enable the live agent brain.

You asked: *"${question}"*

With a key configured, I'd answer using the full desk state (listings, leads, task queue, and filed documents) as context. In the meantime, everything else works: stage listings, queue tasks, and manage your CRM connections.`;
}

function demoDeliverable(title: string, description: string): string {
  return `# ${title}

> **Demo mode**: paste your Anthropic API key under Integrations, then re-run this task to generate the real deliverable with Claude.

**Task brief:** ${description}

When the agent brain is enabled, running this task produces the finished deliverable here (walkthrough script, post set, follow-up sequence, research brief) and files it under Documents automatically.`;
}
