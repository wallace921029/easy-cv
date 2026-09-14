import { useSearchParams } from "react-router";
import { strings } from "@/lib/strings";
import { PageHeader } from "@/components/app/page-header";
import { RegistrationSettings } from "@/components/admin/registration-settings";
import { UsersTable } from "@/components/admin/users-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AdminTab = "users" | "registration";

function readTab(raw: string | null): AdminTab {
  return raw === "registration" ? "registration" : "users";
}

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTab(searchParams.get("tab"));

  return (
    <div className="min-h-screen">
      <PageHeader title={strings.admin.title} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Tabs
          value={tab}
          onValueChange={(value) => setSearchParams({ tab: String(value) }, { replace: true })}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="users">{strings.admin.usersTab}</TabsTrigger>
            <TabsTrigger value="registration">{strings.admin.registrationTab}</TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <UsersTable />
          </TabsContent>
          <TabsContent value="registration">
            <RegistrationSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
