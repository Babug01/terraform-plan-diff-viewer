# Terraform Plan Diff Viewer

**Live demo:** https://terraform-plan-diff-viewer.vercel.app (Vercel) · [GitHub Pages mirror](https://babug01.github.io/terraform-plan-diff-viewer/)

Paste `terraform show -json <planfile>` output and get a readable, color-coded breakdown of exactly
what a plan will do — a summary badge row (create/update/destroy/replace counts) followed by
per-resource cards showing which attributes changed and their before → after values. Also accepts
plain `terraform plan` CLI text as a fallback when JSON output isn't available. Runs entirely in the
browser; nothing you paste ever leaves your machine.

## Features

- **JSON plan parsing** — classifies every entry in `resource_changes[]` by its `change.actions`
  (`create`, `update`, `delete`, `delete`+`create` = replace, `no-op`), with a summary badge row
  showing the count of each
- **Per-resource collapsible cards** listing only the attribute keys that actually changed, with
  before → after values pulled from `change.before`/`change.after` — not a full dump of every
  attribute, changed or not
- **Color-coded by action** — green create, red destroy, yellow update, orange replace, matching the
  same taxonomy Terraform itself uses
- **Plain-text CLI fallback** — when you only have `terraform plan` console output (no `-json`),
  regex-extracts the `Plan: N to add, M to change, D to destroy` summary line and the
  `# module.x.resource_type.name will be <verb>` resource headers, and renders a lighter summary
  without attribute-level detail (the CLI text doesn't reliably expose that)
- **Never crashes on bad input** — unparseable or malformed paste shows a clear "couldn't parse this
  as a Terraform plan" message instead of a blank page or a stack trace
- A **Load Sample** button to see the tool work against a small hand-built plan without needing a
  real Terraform project on hand

## Tech stack

[React](https://react.dev/) + [Vite](https://vitejs.dev/) — parsing and diff classification are
plain JavaScript (regex + JSON traversal), no Terraform SDK or diff library.

## Running locally

```bash
git clone https://github.com/Babug01/terraform-plan-diff-viewer.git
cd terraform-plan-diff-viewer
npm install
npm run dev
```

## License

MIT — see [LICENSE](LICENSE).
