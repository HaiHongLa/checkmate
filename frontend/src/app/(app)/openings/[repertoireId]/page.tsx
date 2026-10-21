import { RepertoireDetail } from "@/components/opening/OpeningLabHome";

export default function RepertoirePage({
  params,
}: {
  params: { repertoireId: string };
}) {
  return <RepertoireDetail repertoireId={params.repertoireId} />;
}
