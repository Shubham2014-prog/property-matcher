import { PageHeader } from "@/components/page-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number | null) {
  return value === null ? "Not set" : currencyFormatter.format(value);
}

function formatNumber(value: number | null) {
  return value === null ? "Not set" : value.toString();
}

function formatList(values: string[]) {
  if (values.length === 0) {
    return "Any";
  }

  return values
    .map((value) => value.charAt(0).toUpperCase() + value.slice(1))
    .join(", ");
}

export default async function ClientsPage() {
  const supabase = createServerSupabaseClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select(
      "id, name, max_budget, min_bedrooms, min_bathrooms, preferred_suburbs, property_types",
    )
    .order("name", { ascending: true });

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Clients"
          description="Manage Neil's buyer clients and their property criteria."
        />
        <Link
          href="/clients/new"
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add client
        </Link>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Clients could not be loaded right now. Please try again shortly.
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white px-5 py-8 text-sm text-slate-600">
          No clients yet. Add Neil&apos;s first buyer profile to start matching
          imported properties.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Beds</th>
                <th className="px-4 py-3">Baths</th>
                <th className="px-4 py-3">Suburbs</th>
                <th className="px-4 py-3">Types</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => (
                <tr key={client.id} className="align-top">
                  <td className="px-4 py-3 font-medium text-slate-950">
                    {client.name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatCurrency(client.max_budget)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatNumber(client.min_bedrooms)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatNumber(client.min_bathrooms)}
                  </td>
                  <td className="max-w-64 px-4 py-3 text-slate-700">
                    {formatList(client.preferred_suburbs)}
                  </td>
                  <td className="max-w-48 px-4 py-3 text-slate-700">
                    {formatList(client.property_types)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/clients/${client.id}/edit`}
                      className="font-medium text-slate-950 underline-offset-4 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
