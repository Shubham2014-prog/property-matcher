import { PageHeader } from "@/components/page-header";
import { AddressImportForm } from "@/components/import/address-import-form";

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Import properties"
        description="Paste up to 100 complete Australian property addresses. Each new address is looked up, saved, and matched against Neil's current buyers."
      />
      <AddressImportForm />
    </>
  );
}
