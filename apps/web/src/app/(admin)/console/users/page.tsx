import { Plus } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { UsersTable } from "./users-table";
import { listUsers } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

export default async function UsersPage() {
  await requireRole(ADMIN_ONLY);

  const users = await listUsers();

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "Users" },
          ]}
          action={
            <Button size="sm" className="gap-2">
              <Plus size={14} /> Invite internal user
            </Button>
          }
        />
        <UsersTable data={users} />
      </main>
    </div>
  );
}
