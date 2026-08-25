import { ResendEmailSender } from "@/services/messaging/resend-email-sender";

import { FiscalService } from "./fiscal.service";

export const fiscalService = new FiscalService(new ResendEmailSender());
export { FiscalService };
