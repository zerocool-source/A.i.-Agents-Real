// Core domain model for AgentForge — an AI-infrastructure business where
// purpose-built agents are deployed per client, then left running on a
// monthly subscription.

export type Vertical =
  | "real-estate"
  | "solar"
  | "clothing"
  | "home-services"
  | "other";

export type AgentTemplateId =
  | "listing-walkthrough" // TikTok/Reels walkthrough video scripts + marketing for realtors
  | "solar-lead-nurture" // qualifies + nurtures solar leads, knows who it's talking to
  | "brand-marketing" // clothing/e-commerce brand marketing agent
  | "home-services-intake" // HVAC/plumbing urgency-classified intake
  | "custom";

export interface AgentTemplate {
  id: AgentTemplateId;
  name: string;
  vertical: Vertical;
  tagline: string;
  description: string;
  capabilities: string[];
  monthlyPrice: number;
}

export type AgentStatus = "deployed" | "building" | "paused";

export interface DeployedAgent {
  id: string;
  clientId: string;
  templateId: AgentTemplateId;
  name: string;
  status: AgentStatus;
  deployedAt: string;
  monthlyPrice: number;
  // Per-client customization the agent brain is prompted with.
  config: {
    businessName: string;
    audience: string;
    goals: string;
    notes?: string;
  };
  stats: { tasksCompleted: number; leadsCaptured: number };
}

export interface Client {
  id: string;
  name: string;
  company: string;
  vertical: Vertical;
  email?: string;
  phone?: string;
  subscriptionStatus: "active" | "trial" | "churned";
  mrr: number;
  createdAt: string;
  notes?: string;
}

export type TaskStatus = "queued" | "in-progress" | "done";
export type TaskKind = "research" | "outreach" | "feature" | "content" | "ops";

export interface Task {
  id: string;
  title: string;
  description: string;
  kind: TaskKind;
  status: TaskStatus;
  tags: string[];
  clientId?: string;
  createdAt: string;
  completedAt?: string;
  // When a task run produces a deliverable, it's saved as a Document and
  // linked here.
  outputDocumentId?: string;
}

export interface Document {
  id: string;
  title: string;
  kind: "report" | "research" | "brief" | "script" | "outreach";
  content: string; // markdown
  createdAt: string;
  clientId?: string;
}

export interface ActivityItem {
  id: string;
  message: string;
  createdAt: string;
  kind: "shipped" | "research" | "outreach" | "system" | "chat";
}

export type IntegrationCategory = "crm" | "erp" | "marketing" | "comms";

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  connected: boolean;
  // Never render this back to the client in full — mask it.
  apiKey?: string;
  connectedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Metrics {
  visitors: number;
  revenue: number;
  mrr: number;
  activeAgents: number;
  updatedAt: string;
}

export interface DB {
  clients: Client[];
  agents: DeployedAgent[];
  tasks: Task[];
  documents: Document[];
  activity: ActivityItem[];
  integrations: Integration[];
  chat: ChatMessage[];
  metrics: Metrics;
}
