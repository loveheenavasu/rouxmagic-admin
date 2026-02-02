import { CRUDWrapper } from "@/core";
import { Footer, GetFootersOpts, FooterFormData, Tables } from "@/types";

export const Footers = new CRUDWrapper<Footer, FooterFormData, GetFootersOpts>(
  Tables.Footer,
  { supports_soft_deletion: false }
);