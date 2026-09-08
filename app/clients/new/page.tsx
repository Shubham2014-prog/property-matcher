import Link from "next/link";

import { createClientAction } from "@/app/clients/actions";
import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/page-header";

export default function NewClientPage() {
  return (
    <>
      <div className="mb-6">
        <Link
          href="/clients"
          className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
        >
          Back to clients
        </Link>
      </div>
      <PageHeader
        title="Add client"
        description="Create a buyer profile with the criteria Neil uses to assess new properties."
      />
      <ClientForm action={createClientAction} submitLabel="Create client" />
    </>
  );
}
