import { Sidebar } from "@/components/Sidebar";
import { LanguageProvider } from "@/components/LanguageProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <div className="flex min-h-screen bg-zinc-950 font-sans selection:bg-[#13ec6d] selection:text-black">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </LanguageProvider>
  );
}
