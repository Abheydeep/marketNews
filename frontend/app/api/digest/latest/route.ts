import { NextResponse } from "next/server";
import { getPublicDigest } from "@/lib/api";

export async function GET() {
  return NextResponse.json(await getPublicDigest());
}
