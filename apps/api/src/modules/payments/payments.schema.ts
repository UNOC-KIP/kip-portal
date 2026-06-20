import { z } from "zod";

/** GET /payments?applicationId= — fetch payments for a specific application. */
export const getPaymentsQuerySchema = z.object({
  applicationId: z.string().uuid(),
});
