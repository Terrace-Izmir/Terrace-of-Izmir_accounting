import { NextRequest } from "next/server";

import { created, handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { createPartnershipMemberSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [members, transactionTotals] = await Promise.all([
      prisma.partnershipMember.findMany({
        include: {
          _count: {
            select: {
              expenses: true,
              cheques: true,
              transactions: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.partnershipTransaction.groupBy({
        by: ["memberId", "type"],
        _sum: { amount: true },
      }),
    ]);

    const totalsMap = new Map<number, Record<string, number>>();
    for (const entry of transactionTotals) {
      if (!totalsMap.has(entry.memberId)) {
        totalsMap.set(entry.memberId, {});
      }
      const existing = totalsMap.get(entry.memberId)!;
      existing[entry.type] = Number(entry._sum.amount ?? 0);
    }

  const data = members.map((member: (typeof members)[number]) => ({
      ...member,
      totals: totalsMap.get(member.id) ?? {},
    }));

    return success(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = createPartnershipMemberSchema.parse(await request.json());

    const member = await prisma.partnershipMember.create({
      data: payload,
    });

    return created(member);
  } catch (error) {
    return handleError(error);
  }
}
