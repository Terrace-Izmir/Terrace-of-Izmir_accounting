import { NextRequest } from "next/server";

import { created, handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { createFolderSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const folders = await prisma.fileFolder.findMany({
      include: {
        children: true,
      },
      orderBy: { name: "asc" },
    });

    return success(folders);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = createFolderSchema.parse(await request.json());

    const folder = await prisma.fileFolder.create({
      data: payload,
    });

    return created(folder);
  } catch (error) {
    return handleError(error);
  }
}
