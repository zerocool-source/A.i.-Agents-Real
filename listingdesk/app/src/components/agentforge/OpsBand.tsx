import { useState } from "react";

import {
  addTeamMember,
  deleteSocialPost,
  draftAdCampaign,
  draftSocialPost,
  enablePayments,
  postSocialPost,
  sendWelcomeEmail,
  toggleAutoPost,
} from "../../lib/agentforge/functions";
import type {
  AdsPanel,
  Billing,
  EmailPanel,
  SitePanel,
  SocialPanel,
  TeamMember,
} from "../../lib/agentforge/types";
import { timeAgo } from "./Shell";

interface Props {
  social: SocialPanel;
  email: EmailPanel;
  site: SitePanel;
  team: TeamMember[];
  ads: AdsPanel;
  billing: Billing;
  onChanged: () => void;
}

export function OpsBand({
  social,
  email,
  site,
  team,
  ads,
  billing,
  onChanged,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [welcomeTo, setWelcomeTo] = useState("");

  async function run(name: string, fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(name);
    try {
      await fn();
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  const latestPost = social.posts[0];
  const latestEmail = email.sent[0];
  const latestCampaign = ads.campaigns[0];

  return (
    <section className="af-section" aria-label="Growth operations">
      {!billing.stripeEnabled ? (
        <button
          className="af-payband"
          type="button"
          onClick={() => run("pay", () => enablePayments())}
          disabled={busy !== null}
        >
          <span>Payments not configured</span>
          <b>{busy === "pay" ? "Enabling…" : "Enable Stripe →"}</b>
        </button>
      ) : (
        <div className="af-payband ready">
          <span>Payments ready</span>
          <b>Connect a live Stripe key under Integrations to charge</b>
        </div>
      )}

      <div className="af-ops">
        {/* Social */}
        <div className="af-op">
          <div className="head">
            <span className="k">Social</span>
            <span className="mono">{social.handle}</span>
          </div>
          {latestPost ? (
            <>
              <p className="body">{latestPost.content}</p>
              <div className="meta">
                {latestPost.status === "posted"
                  ? `published · ${timeAgo(latestPost.postedAt ?? latestPost.createdAt)}`
                  : `draft · ${timeAgo(latestPost.createdAt)}`}
                {" · "}
                {social.posts.filter((p) => p.status === "posted").length}{" "}
                published
              </div>
            </>
          ) : (
            <p className="body muted">No drafts yet. Ask for one.</p>
          )}
          <div className="acts">
            <button
              className="af-opbtn"
              type="button"
              disabled={busy !== null}
              onClick={() => run("draft", () => draftSocialPost())}
            >
              {busy === "draft" ? "Drafting…" : "Draft post"}
            </button>
            {latestPost && latestPost.status === "draft" && (
              <>
                <button
                  className="af-opbtn solid"
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    run("post", () => postSocialPost({ data: { id: latestPost.id } }))
                  }
                >
                  Post
                </button>
                <button
                  className="af-opbtn ghost"
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    run("del", () =>
                      deleteSocialPost({ data: { id: latestPost.id } }),
                    )
                  }
                  aria-label="Discard draft"
                >
                  ✕
                </button>
              </>
            )}
            <label className="af-auto">
              <button
                className={`af-switch mini ${social.autoPost ? "on" : ""}`}
                type="button"
                aria-pressed={social.autoPost}
                aria-label="Toggle auto-post"
                disabled={busy !== null}
                onClick={() => run("auto", () => toggleAutoPost())}
              />
              auto
            </label>
          </div>
        </div>

        {/* Email */}
        <div className="af-op">
          <div className="head">
            <span className="k">Email</span>
            <span className="mono">{email.address}</span>
          </div>
          {latestEmail ? (
            <>
              <p className="body">
                <b>{latestEmail.subject}</b> → {latestEmail.to}
                <br />
                {latestEmail.preview}
              </p>
              <div className="meta">
                {email.sent.length} sent · {email.received} received
              </div>
            </>
          ) : (
            <p className="body muted">Nothing sent yet.</p>
          )}
          <div className="acts">
            <input
              className="af-opinput"
              placeholder="customer@email.com"
              value={welcomeTo}
              onChange={(e) => setWelcomeTo(e.target.value)}
              aria-label="Welcome email recipient"
            />
            <button
              className="af-opbtn solid"
              type="button"
              disabled={busy !== null || welcomeTo.trim().length < 3}
              onClick={() =>
                run("mail", async () => {
                  await sendWelcomeEmail({ data: { to: welcomeTo } });
                  setWelcomeTo("");
                })
              }
            >
              {busy === "mail" ? "Sending…" : "Send welcome"}
            </button>
          </div>
        </div>

        {/* Website & Domain */}
        <div className="af-op">
          <div className="head">
            <span className="k">Website</span>
            <span className={`af-dot ${site.status}`} aria-hidden="true" />
            <span className="mono">{site.status}</span>
          </div>
          <p className="body">
            <a href={site.url} target="_blank" rel="noopener noreferrer">
              {site.domain}
            </a>
            <br />
            Your desk's home on the web. Send sellers here to see the marketing engine behind their listing.
          </p>
          <div className="acts">
            <a
              className="af-opbtn"
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open site
            </a>
            <button className="af-opbtn ghost" type="button" disabled>
              Custom domain soon
            </button>
          </div>
        </div>

        {/* Ads + Team */}
        <div className="af-op">
          <div className="head">
            <span className="k">Ads &amp; team</span>
            <span className="mono">
              {team.length} member{team.length === 1 ? "" : "s"}
            </span>
          </div>
          {latestCampaign ? (
            <p className="body">
              <b>{latestCampaign.name}</b> · ${latestCampaign.dailyBudget}/day
              <br />
              {latestCampaign.audience}
            </p>
          ) : (
            <p className="body muted">
              No campaigns yet. Draft one and the spec files into Documents.
            </p>
          )}
          <div className="acts">
            <button
              className="af-opbtn solid"
              type="button"
              disabled={busy !== null}
              onClick={() => run("ads", () => draftAdCampaign())}
            >
              {busy === "ads" ? "Drafting…" : "Run ads"}
            </button>
            <button
              className="af-opbtn"
              type="button"
              disabled={busy !== null}
              onClick={() => setShowAddMember(true)}
            >
              Add member
            </button>
          </div>
        </div>
      </div>

      {showAddMember && (
        <AddMemberModal
          onClose={() => setShowAddMember(false)}
          onDone={() => {
            setShowAddMember(false);
            onChanged();
          }}
        />
      )}
    </section>
  );
}

function AddMemberModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || !role.trim()) return;
    setSaving(true);
    await addTeamMember({ data: { name, role, email: memberEmail || undefined } });
    setSaving(false);
    onDone();
  }

  return (
    <div className="af-modal-backdrop" onClick={onClose}>
      <div className="af-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add team member</h3>
        <div className="af-field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="af-field">
          <label>Role</label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Closer, VA, Partner…"
          />
        </div>
        <div className="af-field">
          <label>Email (optional)</label>
          <input
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
          />
        </div>
        <div className="af-modal-actions">
          <button className="af-cancel" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="af-confirm"
            onClick={submit}
            disabled={saving}
            type="button"
          >
            {saving ? "Adding…" : "Add member"}
          </button>
        </div>
      </div>
    </div>
  );
}
