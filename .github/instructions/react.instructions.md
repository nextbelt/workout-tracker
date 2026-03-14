---
applyTo: "src/**/*.tsx,src/**/*.ts"
---

- Use functional components with named exports.
- Type all props with explicit interfaces. No `any`.
- Import types from `src/types/database.ts` — these are auto-generated from Supabase.
- Use `@supabase/supabase-js` client from `src/lib/supabase.ts`. Never instantiate a new client.
- Tailwind only for styling. No CSS imports. No `style` prop objects.
- All interactive elements: `min-h-[44px] min-w-[44px]`.
- Use `lucide-react` icons, not emoji or unicode symbols.
- Prefer `useEffect` cleanup for subscriptions. Prefer `useMemo`/`useCallback` for expensive operations.
