type VerificationPageProps = {
  params: Promise<{ batchId: string }>;
};

export default async function VerificationPage({ params }: VerificationPageProps) {
  const { batchId } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-16">
      <p className="text-sm font-medium text-amber-700">Honey Chain verification</p>
      <h1 className="text-3xl font-semibold tracking-tight">Batch {batchId}</h1>
      <p className="text-muted-foreground">Public traceability details will appear here.</p>
    </main>
  );
}