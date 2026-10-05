import { z } from 'zod';
import { MAX_MESSAGE_LENGTH } from '../config/limits';

export const transcriptSchema = z.object({
  text: z.string().trim().max(MAX_MESSAGE_LENGTH),
  languages: z.array(z.string().min(2).max(20)).max(12),
});

export type Transcript = z.infer<typeof transcriptSchema>;
