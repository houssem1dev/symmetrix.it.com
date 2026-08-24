---
name: symmetrix-hardening
description: "Use when improving the Symmetrix cybersecurity website, especially TryHackMe-inspired UI polish, Stripe checkout security, Vercel serverless functions, webhook verification, or payment-flow validation."
---

# Symmetrix Hardening

Improve the Symmetrix single-page security research site while preserving its live telemetry, advisories, academy, authentication, and multilingual behavior.

## Workflow

1. Inspect the owning page and API function before editing. Identify the browser call site, the serverless handler, deployment configuration, and the nearest existing validation command.
2. State one local hypothesis about the defect or design weakness and one cheap check that could disconfirm it.
3. For UI work, preserve the dark security-operations identity but improve hierarchy, responsive behavior, typography, status signaling, and interaction clarity. Do not add fake payment data or claim that a payment is complete before Stripe confirms it.
4. For checkout work, keep course IDs and prices authoritative on the server. Validate the request shape, use an explicit origin allowlist, pass only validated customer data, and return generic client-safe errors while logging diagnostic server details.
5. For webhook work, verify Stripe signatures against the exact raw request body, reject missing signatures or unavailable raw bodies, handle retries idempotently when fulfillment is added, and never grant access from a browser redirect alone.
6. Keep payment links and client configuration as optional, explicit fallbacks only when they are genuinely configured. Never silently route a failed server checkout to a placeholder URL.
7. Make the smallest focused edit, then immediately run the narrowest available executable check. For JavaScript functions use `node --check`; for page scripts use the repository HTML checker or a browser smoke test.
8. Check responsive behavior at desktop and mobile widths when changing CSS. Confirm that text, controls, modal content, and checkout states do not overlap.
9. Review the final diff for unrelated changes. Report changed files, validation performed, required environment variables, and any remaining fulfillment limitation.

## Completion Criteria

- The page remains functional without configured third-party credentials and communicates unavailable integrations honestly.
- Course pricing is selected server-side from an allowlisted course map.
- Checkout requests do not expose secret keys or raw provider errors.
- Webhook signature verification uses the raw body and the configured signing secret.
- CORS is restricted to known site and local development origins.
- The visual update is responsive, readable, and consistent with a professional security operations product.
- Syntax or behavior checks pass after the final edit.
