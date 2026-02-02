import { CRUDWrapper } from "@/core";
import { Tables, Pairing, PairingFormData, GetPairingsOpts } from "@/types";

export const Pairings = new CRUDWrapper<
  Pairing,
  PairingFormData,
  GetPairingsOpts
>(Tables.Pairings);