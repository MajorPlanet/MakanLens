// STUB — owned by api-builder. zod schemas (request bodies, model output, OFF responses).
import { z } from "zod";

export const analyseRequestSchema = z.object({ image: z.string().optional(), text: z.string().optional() });
