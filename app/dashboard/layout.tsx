import { Sidebar } from "@/components/Sidebar";
import { APP_NAME, ORGANIZATION_NAME } from "@/lib/branding";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <Sidebar />
      </div>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <div className="lg:hidden">
            <p className="font-semibold">{ORGANIZATION_NAME}</p>
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground">Plan, play, and manage HSAPSS Windsor sabhas</p>
          </div>
          <div className="rounded-md border bg-card px-3 py-1 text-xs text-muted-foreground">Local projector ready</div>
        </header>
        <div className="border-b lg:hidden">
          <Sidebar />
        </div>
        <main className="mx-auto w-full max-w-[1500px] p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
