import "server-only";

import { HtagPropertyDataProvider } from "./htag-property-data-provider";

export function createPropertyDataProvider() {
  return new HtagPropertyDataProvider();
}
