# Raven Web MVP IA

## Goal

Ship a thin public web surface before mini program approval finishes, then measure whether early users care more about finding festivals, lineup updates, or public crew discovery.

## P0 Routes

| Route | Purpose | Primary Signal |
| --- | --- | --- |
| `/` | Explain value quickly and route users to event browsing or waitlist | CTA click |
| `/events` | Browse and filter activities | Detail click |
| `/events/[id]` | Show event info, lineup, and public recruits | Waitlist / crew click |
| `/waitlist` | Capture early interest via email or external contact flow | Contact intent |

## P1 Routes

| Route | Purpose |
| --- | --- |
| `/events/[id]/crew` | Dedicated public recruit browsing when recruit inventory grows |
| `/city/[slug]` | SEO landing pages for Shanghai / Hangzhou / overseas |
| `/about` | Trust, compliance, and product boundary |

## Deferred

- Full login
- Recruit publishing
- Comments
- AI travel guide generation
- Personal itinerary
- User profile
- Full bilingual IA
