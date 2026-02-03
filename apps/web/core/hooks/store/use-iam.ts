import { useContext } from "react";
// mobx store
import { StoreContext } from "@/lib/store-context";
// types
import type { IIAMStore } from "@/store/iam.store";

export const useIAM = (): IIAMStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useIAM must be used within StoreProvider");
  return context.iam;
};
