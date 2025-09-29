import { prisma } from "@/lib/prisma";
import { getPropertyUnits } from "@/server/property-units";

import { PropertyUnitsClient } from "./property-units-client";

export const dynamic = "force-dynamic";

export default async function PropertyUnitsPage() {
  const [initialUnits, projects] = await Promise.all([
    getPropertyUnits(),
    prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <PropertyUnitsClient initialUnits={initialUnits} projects={projects} />;
}
