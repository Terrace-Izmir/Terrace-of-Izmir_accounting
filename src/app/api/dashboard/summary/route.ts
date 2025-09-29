import { handleError, success } from "@/lib/api-utils";
import { getDashboardSummary } from "@/server/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDashboardSummary();
    return success(data);
  } catch (error) {
    return handleError(error);
  }
}
