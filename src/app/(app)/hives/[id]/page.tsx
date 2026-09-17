import HiveDetail from "./hive-detail";

export default async function HivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HiveDetail hiveId={id} />;
}
