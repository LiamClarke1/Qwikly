import { PollSubscription } from "./_components/poll-subscription";

export const dynamic = "force-dynamic";

export default function PaySuccessPage({
  searchParams,
}: {
  searchParams: { m_payment_id?: string };
}) {
  const mPaymentId = searchParams.m_payment_id ?? "";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <div className="w-full rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold">Payment received</h1>
        <p className="mb-6 text-sm text-gray-600">
          Thanks. We&apos;re flipping the switch on your new plan now.
        </p>
        <PollSubscription mPaymentId={mPaymentId} />
      </div>
    </main>
  );
}
