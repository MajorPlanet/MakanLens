// GET /api/foods/sgfoodid: the SG FoodID snapshot for the client's food list (fetched once, then cached).
import { NextResponse } from "next/server";
import { getSgFile } from "@/lib/sgfoodid.server";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(getSgFile(), {
    headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
