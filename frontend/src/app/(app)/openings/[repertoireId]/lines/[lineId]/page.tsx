"use client";

import { useEffect, useState } from "react";
import { OpeningLineWorkspace } from "@/components/opening/OpeningLineWorkspace";
import { fetchRepertoires, Repertoire } from "@/lib/openingLab";

export default function OpeningLinePage({
  params,
}: {
  params: { repertoireId: string; lineId: string };
}) {
  const [rep, setRep] = useState<Repertoire | null>(null);

  useEffect(() => {
    void fetchRepertoires().then((list) => {
      setRep(list.find((r) => r.id === params.repertoireId) ?? null);
    });
  }, [params.repertoireId]);

  if (!rep) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <OpeningLineWorkspace
      repertoireId={params.repertoireId}
      repertoireName={rep.name}
      repertoireColor={rep.color}
      lineId={params.lineId}
    />
  );
}
