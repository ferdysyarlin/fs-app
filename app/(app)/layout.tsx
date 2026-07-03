import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shared/Sidebar";
import { Toaster } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/providers/ConfirmProvider";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const userName = user.user_metadata?.full_name || user.user_metadata?.name;
  const userAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;

  return (
    <ConfirmProvider>
      <div className="flex min-h-screen">
        <Sidebar
          userEmail={user.email}
          userName={userName}
          userAvatar={userAvatar}
        />
        <main className="flex-1 min-w-0 lg:ml-0">
          <div className="pt-14 lg:pt-0 min-h-screen">
            {children}
          </div>
        </main>
        <Toaster />
      </div>
    </ConfirmProvider>
  );
}
