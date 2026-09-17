import DiagnoseClient from "./diagnose-client";

export default async function DiagnosePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DiagnoseClient hiveId={id} />;
}
