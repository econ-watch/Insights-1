import Link from "next/link";
import { UserMenu } from "./UserMenu";
import type { UserProfile } from "@/lib/supabase/auth";

type HeaderProps = {
  initialUser: UserProfile | null;
};

export function Header({ initialUser }: HeaderProps) {
  return (
    <header className="border-b border-[#1e2530] bg-[#0d1117]">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white transition-colors group-hover:bg-blue-500">
                E
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-white sm:text-lg">
                  EconWatch
                </h1>
                <p className="hidden text-[11px] leading-none text-zinc-500 sm:block">
                  Live Economic Calendar
                </p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <UserMenu initialUser={initialUser} />
          </div>
        </div>
      </div>
    </header>
  );
}
