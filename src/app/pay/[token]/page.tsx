import { supabaseAdmin } from "@/lib/supabase-server";
import { verifyInvoicePayToken } from "@/lib/invoiceLinks";
import { fmt, fmtDateLong } from "@/lib/money";
import PayClient from "./PayClient";

export const dynamic = "force-dynamic";

interface InvoiceForPay {
  id: string;
  invoice_number: string | null;
  total_zar: number;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  business_name: string;
}

async function loadInvoice(invoiceId: string): Promise<InvoiceForPay | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("qwikly_billing_invoices")
    .select("id, invoice_number, total_zar, status, due_at, paid_at, clients(business_name)")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error || !data) return null;

  const clients = data.clients as unknown as { business_name: string | null } | { business_name: string | null }[] | null;
  const businessName = Array.isArray(clients)
    ? (clients[0]?.business_name ?? "")
    : (clients?.business_name ?? "");

  return {
    id: data.id as string,
    invoice_number: (data.invoice_number as string | null) ?? null,
    total_zar: Number(data.total_zar ?? 0),
    status: data.status as string,
    due_at: (data.due_at as string | null) ?? null,
    paid_at: (data.paid_at as string | null) ?? null,
    business_name: businessName || "Qwikly client",
  };
}

function NotFoundShell() {
  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow text-ink-500 mb-4">Qwikly</p>
        <h1 className="font-display font-medium text-3xl tracking-tight mb-3">
          We couldn&rsquo;t find this invoice.
        </h1>
        <p className="text-ink-700 leading-relaxed">
          The link may be incorrect or expired. If you were sent this by Qwikly, please reply to that email and we&rsquo;ll send a fresh link.
        </p>
      </div>
    </div>
  );
}

function StatusShell({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="px-6 pt-10">
        <div className="max-w-xl mx-auto">
          <p className="text-sm font-semibold tracking-tight">
            Qwikly<span className="text-ember">.</span>
          </p>
        </div>
      </header>
      <main className="px-6 pt-16 pb-24">
        <div className="max-w-xl mx-auto">
          <h1 className="font-display font-medium text-[clamp(2rem,4vw,3rem)] leading-tight tracking-tight mb-4">
            {title}
          </h1>
          <p className="text-ink-700 text-lg leading-relaxed">{body}</p>
        </div>
      </main>
    </div>
  );
}

export default async function PayPage({ params }: { params: { token: string } }) {
  const verified = verifyInvoicePayToken(params.token);
  if (!verified.ok) {
    return <NotFoundShell />;
  }

  const invoice = await loadInvoice(verified.invoiceId);
  if (!invoice) {
    return <NotFoundShell />;
  }

  if (invoice.status === "paid") {
    const paidWhen = invoice.paid_at ? fmtDateLong(invoice.paid_at) : "";
    return (
      <StatusShell
        title="This invoice is paid."
        body={`Thanks, we’ve already received and confirmed your payment${paidWhen ? ` on ${paidWhen}` : ""}. Nothing more to do.`}
      />
    );
  }

  if (invoice.status === "awaiting_verification") {
    return (
      <StatusShell
        title="Thanks, we’re verifying your payment."
        body="You’ve already let us know about this one. We’ll confirm it as soon as it lands in our account, and you’ll get a confirmation by email."
      />
    );
  }

  if (invoice.status === "draft" || invoice.status === "cancelled" || invoice.status === "written_off") {
    return <NotFoundShell />;
  }

  if (invoice.status === "disputed") {
    return (
      <StatusShell
        title="This invoice is under review."
        body="There’s an open query on this invoice. Please reply to your last email from Qwikly so we can sort it out before payment."
      />
    );
  }

  return (
    <PayClient
      token={params.token}
      invoiceNumber={invoice.invoice_number ?? invoice.id.slice(0, 8).toUpperCase()}
      businessName={invoice.business_name}
      amountFormatted={fmt(invoice.total_zar)}
      dueDateFormatted={invoice.due_at ? fmtDateLong(invoice.due_at) : null}
      isOverdue={invoice.status === "overdue"}
    />
  );
}
