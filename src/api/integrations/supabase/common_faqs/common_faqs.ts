import { CRUDWrapper } from "@/core";
import { Tables } from "@/types";
import { CommonFaq } from "@/types/integrations/supabase/common_faqs";

export const CommonFaqsAPI = new CRUDWrapper<CommonFaq, any>(
  Tables.CommonFaqs,
  { supports_soft_deletion: false },
);
