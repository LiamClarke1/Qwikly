import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { OutboundLockedOverlay } from '@/components/pipeline/OutboundLockedOverlay';
import { requireOutboundAccess } from '@/lib/auth/require-outbound';

export const dynamic = 'force-dynamic';

export default async function PipelineLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  // Not signed in, let the parent (app) layout handle the redirect.
  if (!user) return <>{children}</>;

  const access = await requireOutboundAccess(user.id);
  if (access.ok) return <>{children}</>;

  // Render the real page content blurred behind the overlay, so the user
  // sees a hint of what they would get and the overlay sits on top.
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none filter blur-sm opacity-60">
        {children}
      </div>
      <OutboundLockedOverlay currentPlan={access.plan ?? 'starter'} />
    </div>
  );
}
