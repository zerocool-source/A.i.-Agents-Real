// SMS updates. When Leslie has connected Twilio (Account SID + Auth Token +
// a from-number), agent events send a real text to her phone via the Twilio
// REST API. Without Twilio connected, the message is queued to her message
// log so the whole flow stays visible and honest. Raw fetch, no SDK.
import type { DB, NotifyEvent, Settings, SmsMessage } from "./types";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function twilioReady(s: Settings): boolean {
  return Boolean(
    s.twilioSid?.trim() && s.twilioToken?.trim() && s.twilioFrom?.trim(),
  );
}

async function sendViaTwilio(
  s: Settings,
  to: string,
  body: string,
): Promise<{ ok: boolean; detail?: string }> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${s.twilioSid}/Messages.json`;
    const form = new URLSearchParams({
      To: to,
      From: s.twilioFrom as string,
      Body: body,
    });
    const auth = btoa(`${s.twilioSid}:${s.twilioToken}`);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
    };
    return { ok: false, detail: data.message ?? `Twilio ${res.status}` };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : "send failed",
    };
  }
}

// Record + (when possible) send a text. Mutates db.messages. The caller is
// responsible for persisting db afterward.
export async function notify(
  db: DB,
  event: NotifyEvent | "test",
  body: string,
): Promise<SmsMessage> {
  const s = db.settings ?? {};
  const to = s.notifyPhone?.trim();
  const prefs = s.notifyPrefs ?? [];

  // For real events (not the test), respect her per-event preferences.
  if (event !== "test" && !prefs.includes(event)) {
    const skipped: SmsMessage = {
      id: uid("sms"),
      to: to ?? "no number set",
      body,
      event,
      status: "queued",
      detail: "Muted: turn this update on under Notifications to get it.",
      createdAt: new Date().toISOString(),
    };
    // Do not store muted messages; just return the record for logging if needed.
    return skipped;
  }

  const msg: SmsMessage = {
    id: uid("sms"),
    to: to ?? "no number set",
    body,
    event,
    status: "queued",
    createdAt: new Date().toISOString(),
  };

  if (to && twilioReady(s)) {
    const r = await sendViaTwilio(s, to, body);
    msg.status = r.ok ? "sent" : "failed";
    msg.detail = r.detail;
  } else {
    msg.detail = to
      ? "Connect Twilio under Notifications to deliver this for real."
      : "Add your mobile number under Notifications to receive updates.";
  }

  db.messages.unshift(msg);
  if (db.messages.length > 100) db.messages = db.messages.slice(0, 100);
  return msg;
}
