import BatchDetail from "./batch-detail";

type PageProps = { params: Promise<{ id: string }> };

export default async function BatchPage({ params }: PageProps) {
  const { id } = await params;
  return <BatchDetail batchId={id} />;
}
