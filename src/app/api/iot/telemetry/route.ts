export async function POST(request: Request) {
  const payload = await request.json();

  return Response.json(
    { accepted: false, message: "Telemetry handler placeholder.", payload },
    { status: 501 },
  );
}