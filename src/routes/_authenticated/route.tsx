import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { OrganizationProvider } from "@/components/organization/OrganizationProvider";
import { PageError } from "@/components/PageError";
import { getSession } from "@/services/organizationStorageService";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getSession()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
  errorComponent: PageError,
});

function AuthenticatedLayout() {
  return (
    <OrganizationProvider>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </OrganizationProvider>
  );
}
