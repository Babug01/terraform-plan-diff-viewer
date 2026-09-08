import { Fragment, useState } from "react";
import Header from "./components/Header";
import { parsePlanInput } from "./lib/parsePlan";

const REPO_URL = "https://github.com/Babug01/terraform-plan-diff-viewer";

const ACTION_META = {
  create: { label: "Create", color: "#3fb950", bg: "rgba(63,185,80,0.12)" },
  update: { label: "Update", color: "#c9a92e", bg: "rgba(201,169,46,0.14)" },
  delete: { label: "Destroy", color: "#e05c5c", bg: "rgba(224,92,92,0.12)" },
  replace: { label: "Replace", color: "#d97706", bg: "rgba(217,119,6,0.14)" },
  noop: { label: "No-op", color: "#8a8a8a", bg: "rgba(138,138,138,0.12)" },
};

function fmtValue(v) {
  if (v === undefined) return "(unknown)";
  if (v === null) return "null";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function Badge({ action, count }) {
  const meta = ACTION_META[action] || ACTION_META.noop;
  return (
    <span style={{ ...styles.badge, color: meta.color, background: meta.bg }}>
      {meta.label}: {count}
    </span>
  );
}

function ResourceCard({ res }) {
  const meta = ACTION_META[res.action] || ACTION_META.noop;
  return (
    <details style={{ ...styles.card, borderColor: meta.color }}>
      <summary style={styles.cardSummary}>
        <span style={{ ...styles.actionTag, color: meta.color, background: meta.bg }}>{meta.label}</span>
        <span style={styles.cardAddress}>{res.address}</span>
        <span style={styles.cardCount}>{res.changed.length} attr{res.changed.length !== 1 ? "s" : ""} changed</span>
      </summary>
      {res.changed.length > 0 ? (
        <div style={styles.attrGrid}>
          <div style={styles.attrHead}>Attribute</div>
          <div style={styles.attrHead}>Before</div>
          <div style={styles.attrHead}>After</div>
          {res.changed.map((c) => (
            <Fragment key={c.key}>
              <div style={styles.attrKey}>{c.key}</div>
              <div style={styles.attrVal}>{fmtValue(c.before)}</div>
              <div style={styles.attrVal}>{fmtValue(c.after)}</div>
            </Fragment>
          ))}
        </div>
      ) : (
        <p style={styles.noAttrs}>No attribute-level changes (metadata-only change).</p>
      )}
    </details>
  );
}

export default function TerraformPlanDiffViewer() {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState(null);

  function parse() {
    setParsed(parsePlanInput(input));
  }

  function clearAll() {
    setInput("");
    setParsed(null);
  }

  const loadSample = () => {
    setInput(SAMPLE_JSON);
    setParsed(parsePlanInput(SAMPLE_JSON));
  };

  return (
    <div style={styles.root}>
      <Header repoUrl={REPO_URL} />
      <div style={styles.content}>
        <h1 style={styles.title}>Terraform Plan Diff Viewer</h1>
        <p style={styles.subtitle}>
          Paste `terraform show -json &lt;planfile&gt;` output for a full attribute-level diff, or plain
          `terraform plan` CLI text for a lighter summary. Nothing leaves the browser.
        </p>

        <textarea
          style={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste terraform show -json output, or terraform plan CLI output..."
          spellCheck={false}
        />
        <div style={styles.row}>
          <button style={styles.btn("primary")} onClick={parse}>Parse Plan</button>
          <button style={styles.btn("secondary")} onClick={clearAll}>Clear</button>
          <button style={styles.btn("secondary")} onClick={loadSample}>Load Sample</button>
        </div>

        {parsed && !parsed.ok && parsed.error && <div style={styles.errorBox}>{parsed.error}</div>}

        {parsed && parsed.ok && parsed.mode === "json" && (
          <>
            <div style={styles.badgeRow}>
              <Badge action="create" count={parsed.summary.create} />
              <Badge action="update" count={parsed.summary.update} />
              <Badge action="delete" count={parsed.summary.delete} />
              <Badge action="replace" count={parsed.summary.replace} />
              {parsed.summary.noop > 0 && <Badge action="noop" count={parsed.summary.noop} />}
            </div>

            {parsed.resources.filter((r) => r.action !== "no-op" && r.action !== "noop").length === 0 ? (
              <p style={styles.noAttrs}>No changes — plan is a no-op.</p>
            ) : (
              <div style={styles.cardList}>
                {parsed.resources
                  .filter((r) => r.action !== "no-op")
                  .map((r) => (
                    <ResourceCard key={r.address} res={r} />
                  ))}
              </div>
            )}
          </>
        )}

        {parsed && parsed.ok && parsed.mode === "text" && (
          <>
            <div style={styles.sectionTitle}>Summary (from CLI text — no attribute detail available)</div>
            {parsed.summary ? (
              <div style={styles.badgeRow}>
                <Badge action="create" count={parsed.summary.add} />
                <Badge action="update" count={parsed.summary.change} />
                <Badge action="delete" count={parsed.summary.destroy} />
              </div>
            ) : (
              <p style={styles.noAttrs}>No "Plan: N to add, M to change, D to destroy" line found.</p>
            )}

            {parsed.resourceLines.length > 0 && (
              <div style={{ ...styles.cardList, marginTop: 16 }}>
                {parsed.resourceLines.map((r, i) => {
                  const meta = ACTION_META[r.action] || ACTION_META.noop;
                  return (
                    <div key={r.address + i} style={styles.textLine}>
                      <span style={{ ...styles.actionTag, color: meta.color, background: meta.bg }}>{meta.label}</span>
                      <span style={styles.cardAddress}>{r.address}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const SAMPLE_JSON = JSON.stringify(
  {
    resource_changes: [
      {
        address: "azurerm_resource_group.example",
        type: "azurerm_resource_group",
        name: "example",
        change: { actions: ["create"], before: null, after: { name: "rg-example-dev", location: "westeurope" } },
      },
      {
        address: "azurerm_storage_account.example",
        type: "azurerm_storage_account",
        name: "example",
        change: {
          actions: ["update"],
          before: { account_tier: "Standard", tags: { env: "dev" } },
          after: { account_tier: "Standard", tags: { env: "dev", owner: "platform" } },
        },
      },
      {
        address: "azurerm_public_ip.legacy",
        type: "azurerm_public_ip",
        name: "legacy",
        change: { actions: ["delete"], before: { name: "pip-legacy" }, after: null },
      },
      {
        address: "azurerm_subnet.example",
        type: "azurerm_subnet",
        name: "example",
        change: {
          actions: ["delete", "create"],
          before: { address_prefixes: ["10.0.1.0/24"] },
          after: { address_prefixes: ["10.0.2.0/24"] },
        },
      },
    ],
  },
  null,
  2
);

const styles = {
  root: { minHeight: "100dvh", display: "flex", flexDirection: "column" },
  content: {
    fontFamily: "system-ui, sans-serif", padding: "24px 32px", maxWidth: 980, margin: "0 auto",
    color: "var(--text, #1a1a1a)", width: "100%", boxSizing: "border-box", background: "var(--bg-subtle, #f0efed)", flex: 1,
  },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  subtitle: { fontSize: 13, opacity: 0.6, margin: "4px 0 20px" },
  textarea: {
    width: "100%", minHeight: 200, padding: 12, borderRadius: 8, border: "1px solid var(--border, #e5e7eb)",
    background: "var(--input-bg, #f9fafb)", color: "var(--text, #1a1a1a)", fontSize: 12, boxSizing: "border-box",
    fontFamily: "'SFMono-Regular', Consolas, monospace", resize: "vertical",
  },
  row: { display: "flex", gap: 10, marginTop: 12, marginBottom: 20 },
  btn: (kind) => ({
    padding: "9px 18px", borderRadius: 6, border: kind === "primary" ? "none" : "1px solid var(--border, #e5e7eb)",
    background: kind === "primary" ? "var(--accent, #4f46e5)" : "transparent",
    color: kind === "primary" ? "#fff" : "var(--text, #1a1a1a)", cursor: "pointer", fontSize: 13, fontWeight: 600,
  }),
  errorBox: {
    padding: 16, borderRadius: 8, border: "1px solid #e05c5c", background: "rgba(224,92,92,0.08)",
    color: "#e05c5c", fontSize: 13, marginBottom: 20,
  },
  badgeRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 },
  badge: { display: "inline-block", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700 },
  sectionTitle: { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.6, marginBottom: 10 },
  cardList: { display: "flex", flexDirection: "column", gap: 10 },
  card: {
    border: "1px solid var(--border, #e5e7eb)", borderLeftWidth: 4, borderRadius: 8,
    background: "var(--bg, #fff)", padding: "10px 14px", overflow: "hidden",
  },
  cardSummary: { display: "flex", alignItems: "center", gap: 12, cursor: "pointer", listStyle: "none", fontSize: 13 },
  actionTag: { padding: "2px 10px", borderRadius: 14, fontSize: 11, fontWeight: 700, flexShrink: 0 },
  cardAddress: { fontFamily: "'SFMono-Regular', Consolas, monospace", fontSize: 12.5, flex: 1, wordBreak: "break-all" },
  cardCount: { fontSize: 11, opacity: 0.55, flexShrink: 0 },
  attrGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 14px", fontSize: 12,
    marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border, #e5e7eb)",
  },
  attrHead: { fontWeight: 700, opacity: 0.5, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" },
  attrKey: { fontFamily: "'SFMono-Regular', Consolas, monospace", opacity: 0.8, wordBreak: "break-all" },
  attrVal: { fontFamily: "'SFMono-Regular', Consolas, monospace", wordBreak: "break-all" },
  noAttrs: { fontSize: 13, opacity: 0.6 },
  textLine: {
    display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", borderRadius: 8,
    border: "1px solid var(--border, #e5e7eb)", background: "var(--bg, #fff)", fontSize: 13,
  },
};
