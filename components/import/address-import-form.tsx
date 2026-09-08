"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  importAddressesAction,
  type ImportFormState,
} from "@/app/import/actions";

const initialState: ImportFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? "Importing..." : "Import properties"}
    </button>
  );
}

export function AddressImportForm() {
  const [state, formAction] = useActionState(
    importAddressesAction,
    initialState,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        action={formAction}
        className="rounded-md border border-slate-200 bg-white p-5"
      >
        <label>
          <span className="text-sm font-medium text-slate-800">Addresses</span>
          <textarea
            name="addresses"
            rows={14}
            placeholder="1 Floral Avenue Tweed Heads South, NSW 2486"
            className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-slate-500"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          One complete Australian property address per line. Blank lines are
          ignored. Maximum 100 addresses.
        </p>

        {state.formError ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {state.formError}
          </div>
        ) : null}

        <div className="mt-5">
          <SubmitButton />
        </div>
      </form>

      <aside className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-950">Import summary</h2>
        {state.totalAddresses === undefined ? (
          <div className="mt-2 space-y-3 text-sm text-slate-600">
            <p>Import results will appear here after processing.</p>
            <ul className="space-y-2 text-xs leading-5 text-slate-500">
              <li>Blank lines are ignored.</li>
              <li>Duplicate addresses are skipped.</li>
              <li>Addresses that cannot be completed are kept for review.</li>
            </ul>
          </div>
        ) : (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Submitted</dt>
                <dd className="font-semibold text-slate-950">
                  {state.totalAddresses}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Imported</dt>
                <dd className="font-semibold text-emerald-700">
                  {state.successfulCount}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Duplicates</dt>
                <dd className="font-semibold text-amber-700">
                  {state.duplicateCount}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Failed</dt>
                <dd className="font-semibold text-red-700">
                  {state.failedCount}
                </dd>
              </div>
            </dl>

            {state.results && state.results.length > 0 ? (
              <div className="mt-5 max-h-96 overflow-y-auto border-t border-slate-100 pt-4">
                <ul className="space-y-3">
                  {state.results.map((result, index) => (
                    <li key={`${result.address}-${index}`} className="text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-700">{result.address}</span>
                        <span
                          className={
                            result.status === "success"
                              ? "shrink-0 rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                              : result.status === "duplicate"
                                ? "shrink-0 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"
                                : "shrink-0 rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                          }
                        >
                          {result.status}
                        </span>
                      </div>
                      {result.message ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {result.message}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </aside>
    </div>
  );
}
