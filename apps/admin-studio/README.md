# Admin Studio

Private React SPA for the command center.

Boundary rules:

- Requires Auth0/JWT permissions before rendering protected actions.
- Owns script editing, digest regeneration, asset generation, and publish controls.
- Does not ship in the public portal bundle.
- Uses shared UI primitives and typed API clients from the local packages.

Deployment target: internal network, VPN-protected static host, or an Auth0-protected route.
