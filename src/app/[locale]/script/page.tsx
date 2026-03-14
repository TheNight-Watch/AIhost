export default async function ScriptPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-3xl font-bold">
        {locale === "zh" ? "台词编辑" : "Script Editor"}
      </h1>
    </main>
  );
}
