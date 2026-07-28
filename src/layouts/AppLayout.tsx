import { Sidebar } from "../components/layout/Sidebar";
import { TopHeader } from "../components/layout/TopHeader";
import { MobileNavigation } from "../components/layout/MobileNavigation";
import { PageTransition } from "../components/ui/PageTransition";

export function AppLayout() {
  return (
    <div className="flex min-h-svh bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:px-8">
          <PageTransition />
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
