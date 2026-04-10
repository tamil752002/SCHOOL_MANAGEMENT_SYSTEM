
import { z } from "zod";

export const bulkMoveSchema = z.object({
  schoolId: z.string().min(1, "schoolId is required"),
  studentIds: z
    .array(z.string().min(1))
    .nonempty("studentIds cannot be empty"),
  targetClass: z.string().optional(),
  targetSection: z.string().optional().default("A"),
});