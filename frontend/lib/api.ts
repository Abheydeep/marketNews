import { mockDigest } from "./mockDigest";
import type { PublicDigest } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export async function getPublicDigest(): Promise<PublicDigest> {
  try {
    const response = await fetch(`${API_BASE}/api/public/digest/today`, {
      cache: "no-store"
    });
    if (!response.ok) {
      return mockDigest;
    }
    return response.json();
  } catch {
    return mockDigest;
  }
}
