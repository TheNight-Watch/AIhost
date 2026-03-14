export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">AI Host</h1>
      <p className="mt-4 text-lg text-gray-600">
        {locale === "zh"
          ? "AI 驱动的智能主持人平台"
          : "AI-powered intelligent hosting platform"}
      </p>
    </main>
  );
}
