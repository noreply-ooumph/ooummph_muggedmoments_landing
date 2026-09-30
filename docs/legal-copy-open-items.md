# Legal copy — open items before /privacy and /terms can ship

Source: "MuggedMoments — Legal, Trust & SEO Developer Package" (the docx you shared).
That doc drafts real Privacy Policy / Terms of Service / consent-checkbox copy against
the correct statutes (India's DPDP Act 2023, TRAI TCCCPR, Consumer Protection
E-Commerce Rules 2020) — the clause structure and legal language are production-grade.
What's listed below is only the gap: every 【bracketed】 value in that draft, which is a
fact only the business or a lawyer can supply. Nothing here should be filled by
guessing — that's exactly the mistake the source doc warns against ("a developer who
wires up a clause with the bracket still in it has shipped a compliance gap, not a
placeholder").

Each row: the bracket, what it needs, and who owns supplying it.

## Business facts (Ops/Founder — no lawyer needed)

| # | Bracket | What's needed | Notes |
|---|---|---|---|
| 1 | Legal entity name | Full registered company name | e.g. "MyOoumph Networks Private Limited" or whichever entity actually operates MuggedMoments |
| 2 | CIN | Corporate Identification Number | From MCA registration |
| 3 | Registered office address | Full postal address | Must match MCA records |
| 4 | Grievance Officer — name | A named individual | DPDP Act requires a real named contact, not a department |
| 5 | Grievance Officer — email/phone/postal address | Contact details for #4 | |
| 6 | Retention period per data category | e.g. "24 months for an unconverted lead," "7 years for transaction records" | Ops decision, informed by what's actually needed operationally + any tax-law minimums |
| 7 | Hosting/processing region(s) | Where servers/DB actually live | Depends on final infra choice |
| 8 | Fees (§2.5 of Terms) | Is planning assistance free for Buyers? What (if anything) do Sellers pay? | **Business decision, not legal** — the doc flags this as previously undecided; confirm current answer before publishing |
| 9 | Liability cap | A rupee cap, or "fees paid in preceding 12 months" | Business risk-tolerance call, informed by counsel |
| 10 | Governing law / jurisdiction city | e.g. "courts at Lucknow" or an arbitration clause + seat city | Pick one approach |

## Needs a lawyer's actual sign-off (not just a fact to fill in)

- Full review of the drafted Privacy Policy + Terms against MuggedMoments' **actual** data
  flows (the doc is explicit this isn't a substitute for that review)
- Confirmation of the current DPDP Rules grievance-response timeline (doc estimates
  7–90 days but flags this needs confirming against whatever Rules are in force at
  launch)
- Whichever governing-law/arbitration option is picked (item #10) — needs counsel
  confirmation, not just a business pick
- If MuggedMoments' actual audience includes under-18 users (e.g. college-fest
  organisers) — the doc flags this changes the consent flow materially, not just the copy

## Already resolved / no action needed

- WhatsApp/SMS consent checkbox exact wording — drafted, TRAI-TCCCPR-compliant,
  ready to use as-is once wired to a real WhatsApp/SMS provider (still pending your
  provider choice, tracked separately)
- AI processing notice short-form copy — drafted, ready as-is
- Consent logging requirements (`consent_type`, `consent_status`, `consent_version`,
  `timestamp`, `journey_id`) — a spec for future work, not something this codebase
  needs today since there's no AI assistant flow to attach it to yet

---

**How to use this**: hand the "Business facts" table to whoever owns Ops/company
records — most of it is a five-minute lookup. Hand the whole doc plus the "needs a
lawyer" section to counsel. Once you have real values for rows 1–10, tell me and I'll
replace the brackets in the actual `/privacy` and `/terms` pages — I won't fill any of
them from a guess.
