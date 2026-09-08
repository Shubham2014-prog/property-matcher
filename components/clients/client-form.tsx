"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { ClientFormState } from "@/app/clients/actions";
import type { Client } from "@/types/database";

const propertyTypeOptions = [
  { label: "House", value: "house" },
  { label: "Townhouse", value: "townhouse" },
  { label: "Apartment", value: "apartment" },
  { label: "Unit", value: "unit" },
];

type ClientFormProps = {
  action: (
    previousState: ClientFormState,
    formData: FormData,
  ) => Promise<ClientFormState>;
  client?: Client;
  submitLabel: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-sm text-red-700">{message}</p>;
}

export function ClientForm({ action, client, submitLabel }: ClientFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form
      action={formAction}
      className="max-w-3xl rounded-md border border-slate-200 bg-white p-5"
    >
      {state.formError ? (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.formError}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-sm font-medium text-slate-800">Name</span>
          <input
            name="name"
            type="text"
            required
            defaultValue={client?.name ?? ""}
            className="mt-1 block h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
          />
          <FieldError message={state.fieldErrors?.name} />
        </label>

        <label>
          <span className="text-sm font-medium text-slate-800">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={client?.email ?? ""}
            className="mt-1 block h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
          />
          <FieldError message={state.fieldErrors?.email} />
        </label>

        <label>
          <span className="text-sm font-medium text-slate-800">Phone</span>
          <input
            name="phone"
            type="tel"
            defaultValue={client?.phone ?? ""}
            className="mt-1 block h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
          />
          <FieldError message={state.fieldErrors?.phone} />
        </label>

        <label>
          <span className="text-sm font-medium text-slate-800">
            Maximum budget
          </span>
          <input
            name="max_budget"
            type="text"
            inputMode="numeric"
            defaultValue={client?.max_budget ?? ""}
            className="mt-1 block h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
          />
          <FieldError message={state.fieldErrors?.max_budget} />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className="text-sm font-medium text-slate-800">
              Minimum bedrooms
            </span>
            <input
              name="min_bedrooms"
              type="number"
              min="0"
              step="1"
              defaultValue={client?.min_bedrooms ?? ""}
              className="mt-1 block h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
            />
            <FieldError message={state.fieldErrors?.min_bedrooms} />
          </label>

          <label>
            <span className="text-sm font-medium text-slate-800">
              Minimum bathrooms
            </span>
            <input
              name="min_bathrooms"
              type="number"
              min="0"
              step="1"
              defaultValue={client?.min_bathrooms ?? ""}
              className="mt-1 block h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
            />
            <FieldError message={state.fieldErrors?.min_bathrooms} />
          </label>
        </div>

        <label className="sm:col-span-2">
          <span className="text-sm font-medium text-slate-800">
            Preferred suburbs
          </span>
          <input
            name="preferred_suburbs"
            type="text"
            defaultValue={client?.preferred_suburbs.join(", ") ?? ""}
            placeholder="Tweed Heads South, Banora Point"
            className="mt-1 block h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium text-slate-800">
            Preferred property types
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            {propertyTypeOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  name="property_types"
                  value={option.value}
                  defaultChecked={
                    client?.property_types.includes(option.value) ?? false
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="sm:col-span-2">
          <span className="text-sm font-medium text-slate-800">Notes</span>
          <textarea
            name="notes"
            rows={4}
            defaultValue={client?.notes ?? ""}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <FieldError message={state.fieldErrors?.notes} />
        </label>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
