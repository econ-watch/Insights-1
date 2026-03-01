import { getCurrentUser } from "@/lib/supabase/auth";
import { LandingPage } from "./landing/LandingPage";
import { CalendarView } from "./calendar/CalendarView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();

  // Unauthenticated users see the landing/marketing page
  if (!user) {
    return <LandingPage />;
  }

  // Authenticated users see the calendar
  return <CalendarView searchParams={searchParams} user={user} />;
}
