import Anthropic from "@anthropic-ai/sdk";

// The agent brain. Uses Claude when ANTHROPIC_API_KEY is set; otherwise the
// app runs in demo mode with clearly-labeled canned output so the dashboard
// is fully explorable without a key.

const MODEL = "claude-opus-4-8";

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client(): Anthropic {
  return new Anthropic();
}

const COMPANY_SYSTEM = `You are the AI Chief of Staff for AgentForge, a one-person AI-infrastructure business.

The business model: purpose-built AI agents deployed per client in minutes (not months), left running, billed at $200/month. Current verticals: real-estate listing walkthrough videos + lead gen (client: Antoine Freeman, Freeman Realty), solar lead nurture (SunPeak Solar), clothing brand marketing (Vellum & Co.), and home-services intake.

You help the founder run the business: research segments, draft outreach, plan agent builds, and write client deliverables. Be concrete and actionable — this founder ships. Use markdown. Keep chat answers tight; deliverables can be thorough.`;

export async function askBrain(
  question: string,
  context: string,
): Promise<string> {
  if (!hasApiKey()) {
    return demoChat(question);
  }
  const stream = client().messages.stream({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: [
      { type: "text", text: COMPANY_SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `Current business state:\n${context}\n\n---\n\n${question}`,
      },
    ],
  });
  const message = await stream.finalMessage();
  return textOf(message);
}

export async function runTaskBrain(
  taskTitle: string,
  taskDescription: string,
  context: string,
): Promise<string> {
  if (!hasApiKey()) {
    return demoDeliverable(taskTitle, taskDescription);
  }
  const stream = client().messages.stream({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: [
      { type: "text", text: COMPANY_SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `Current business state:\n${context}\n\n---\n\nExecute this task and return the finished deliverable as a well-structured markdown document. Do not describe what you would do — produce the actual deliverable.\n\nTask: ${taskTitle}\n\nDetails: ${taskDescription}`,
      },
    ],
  });
  const message = await stream.finalMessage();
  return textOf(message);
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Demo mode

function demoChat(question: string): string {
  return `**Demo mode** — set \`ANTHROPIC_API_KEY\` in \`.env\` to enable the live agent brain.

You asked: *"${question}"*

With a key configured, I'd answer using the full business state (clients, deployed agents, task queue, and research documents) as context. In the meantime, everything else on the dashboard works: queue tasks, deploy agents from templates, and manage CRM/ERP connections.`;
}

function demoDeliverable(title: string, description: string): string {
  return `# ${title}

> **Demo mode** — set \`ANTHROPIC_API_KEY\` in \`.env\` and re-run this task to generate the real deliverable with Claude.

**Task brief:** ${description}

When the agent brain is enabled, running this task produces the finished deliverable here (research brief, outreach sequence, walkthrough script, etc.) and files it under Documents automatically.`;
}
