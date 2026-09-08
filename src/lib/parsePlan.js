// Pure parsing/classification logic, kept free of React so it can be
// smoke-tested directly with `node` against fixture JSON — no JSX, no DOM.

export function classifyAction(actions) {
  const set = new Set(actions || []);
  if (set.has("create") && set.has("delete")) return "replace";
  if (set.has("create")) return "create";
  if (set.has("delete")) return "delete";
  if (set.has("update")) return "update";
  return "no-op";
}

function stableStringify(v) {
  // JSON.stringify is enough here — we only need equality, not canonical
  // key ordering, since both sides come from the same Terraform plan JSON.
  return JSON.stringify(v === undefined ? null : v);
}

function diffKeys(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const changed = [];
  for (const k of keys) {
    const b = before ? before[k] : undefined;
    const a = after ? after[k] : undefined;
    if (stableStringify(b) !== stableStringify(a)) {
      changed.push({ key: k, before: b, after: a });
    }
  }
  changed.sort((x, y) => x.key.localeCompare(y.key));
  return changed;
}

// Parses `terraform show -json <planfile>` output. Returns null (not
// {ok:false}) when the input simply isn't this shape, so the caller can fall
// through to the plain-text parser without treating "not JSON" as an error.
export function parsePlanJson(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object" || !Array.isArray(data.resource_changes)) return null;

  const summary = { create: 0, update: 0, delete: 0, replace: 0, noop: 0 };
  const resources = data.resource_changes.map((rc) => {
    const action = classifyAction(rc.change && rc.change.actions);
    summary[action === "no-op" ? "noop" : action] += 1;
    return {
      address: rc.address,
      type: rc.type,
      name: rc.name,
      action,
      before: (rc.change && rc.change.before) ?? null,
      after: (rc.change && rc.change.after) ?? null,
      changed: diffKeys(rc.change && rc.change.before, rc.change && rc.change.after),
    };
  });

  return { mode: "json", summary, resources };
}

// Maps the verb phrase in a `terraform plan` CLI header line
// ("# aws_instance.x will be created") to our action taxonomy.
const VERB_MAP = {
  created: "create",
  "updated in-place": "update",
  destroyed: "delete",
  replaced: "replace",
};

// Fallback for when only the plain-text CLI output is available (no `-json`
// plan). Much lighter: just the summary line and the per-resource verb, no
// attribute-level before/after (the CLI text doesn't reliably give us that
// in a parseable form).
export function parsePlanText(raw) {
  const summaryMatch = raw.match(/Plan:\s*(\d+)\s*to add,\s*(\d+)\s*to change,\s*(\d+)\s*to destroy/i);

  const headerRegex = /^[ \t]*#\s+(\S+)\s+(?:will be|must be)\s+([a-zA-Z][a-zA-Z -]*)/gm;
  const resourceLines = [];
  let m;
  while ((m = headerRegex.exec(raw)) !== null) {
    const verb = m[2].trim().toLowerCase();
    const action = VERB_MAP[verb];
    if (action) resourceLines.push({ address: m[1], action });
  }

  if (!summaryMatch && resourceLines.length === 0) return null;

  return {
    mode: "text",
    summary: summaryMatch
      ? { add: Number(summaryMatch[1]), change: Number(summaryMatch[2]), destroy: Number(summaryMatch[3]) }
      : null,
    resourceLines,
  };
}

// Single entry point the UI calls. Never throws — malformed/unrecognized
// input comes back as {ok:false} so the page can show a message instead of
// crashing.
export function parsePlanInput(raw) {
  if (!raw || !raw.trim()) return { ok: false, empty: true };
  const json = parsePlanJson(raw);
  if (json) return { ok: true, ...json };
  const text = parsePlanText(raw);
  if (text) return { ok: true, ...text };
  return {
    ok: false,
    error: "Couldn't parse this as a Terraform plan. Paste `terraform show -json <planfile>` output, or plain `terraform plan` CLI output.",
  };
}
