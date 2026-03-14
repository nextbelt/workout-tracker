---
applyTo: "api-proxy/**/*.ts"
---

- Express routes in `api-proxy/src/routes/`.
- Use TypeScript strict mode. No `any`.
- All external API calls wrapped in try/catch with graceful fallback.
- Never return raw external API responses to the client. Normalize to the `NormalizedFood` interface.
- Rate limiting: in-memory per-IP, 100 req/min.
- CORS: whitelist only the Railway frontend domain from environment variable.
- Environment variables: `USDA_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
- Never log API keys or user tokens.
