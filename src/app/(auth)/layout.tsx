import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function LayoutAutenticacao({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-8">
      <header>
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {APP_NAME}
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
