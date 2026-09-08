import Link from "next/link";
import { notFound } from "next/navigation";

import { updateClientAction } from "@/app/clients/actions";
import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/page-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EditClientPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !client) {
    notFound();
  }

  const action = updateClientAction.bind(null, client.id);

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
        title={`Edit ${client.name}`}
        description="Update buyer criteria used by the matching workflow."
      />
      <ClientForm
        action={action}
        client={client}
        submitLabel="Save changes"
      />
    </>
  );
}
