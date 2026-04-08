import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar user={session} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
