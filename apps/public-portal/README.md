# Public Portal

SEO-first Next.js app for the public one-page market summary.

Boundary rules:

- No admin routes or script editing logic.
- Reads precomputed digest data through `@market-narrative/api-client`.
- Uses shared presentational primitives from `@market-narrative/ui`.
- Owns `NewsArticle` JSON-LD, `generateMetadata`, Open Graph metadata, and public share surfaces.

Deployment target: edge/static hosting such as GitHub Pages export, Vercel, Cloudflare Pages, or S3 + CloudFront.
