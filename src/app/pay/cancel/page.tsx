import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PayCancelPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <div className="w-full rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold">Payment cancelled</h1>
        <p className="mb-6 text-sm text-gray-600">
          No worries. You haven&apos;t been charged. You can try again any time.
        </p>
        <div className="flex gap-3">
          <Link
            href="/pricing"
            className="inline-block rounded bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Back to pricing
          </Link>
          <Link
            href="/dashboard"
            className="inline-block rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
