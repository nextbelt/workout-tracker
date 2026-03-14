# Workout Tracker — Agent Instructions

## Project Context
This is a hypertrophy-focused workout PWA for experienced lifters. It includes:
- 4-day Upper/Lower training split with 4-week block rotation
- Exercise swap system with movement pool constraints
- Three-tier recovery system (great/normal/poor)
- Macro tracker with USDA + Open Food Facts API integration
- Supabase Auth with multi-user RLS isolation
- PWA installable on mobile

## Critical Rules
- RLS is non-negotiable. Every query must respect `auth.uid() = user_id`.
- Exercise swaps must stay within the same movement pool.
- Block rotation changes 2-4 exercises, not all. Anchor lifts persist.
- Protein target (170-190g) is the hero metric in nutrition UI.
- All touch targets minimum 44px. Mobile-first, dark mode only.
- Run `npx supabase gen types typescript` after any migration change.

## Agent Routing

| Task | Agent | Invoke |
|------|-------|--------|
| New table or migration | `@schema-agent` | "Create a migration for bodyweight_log table" |
| Build a UI component | `@frontend-agent` | "Build the daily macro dashboard" |
| Add a proxy route | `@api-agent` | "Add barcode lookup route" |
| Implement progression logic | `@workout-engine` | "Implement stall detection hook" |
| Validate a PR | `@qa-agent` | "Review this migration for RLS compliance" |
