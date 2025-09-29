import { getChequeOverview, getChequeReferenceData } from "@/server/cheques";

import { ChequesClient } from "./cheques-client";

export const dynamic = "force-dynamic";
export default async function ChequesPage() {
  const [initialCheques, referenceData] = await Promise.all([
    getChequeOverview(),
    getChequeReferenceData(),
  ]);

  return <ChequesClient initialCheques={initialCheques} referenceData={referenceData} />;
}
