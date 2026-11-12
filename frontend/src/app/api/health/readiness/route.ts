import { backendReady } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  const ready = await backendReady();
  return Response.json({ status: ready ? "UP" : "DOWN" }, {
    status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" },
  });
}
