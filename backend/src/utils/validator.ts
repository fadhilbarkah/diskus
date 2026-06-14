import { zValidator as honoZValidator } from '@hono/zod-validator';
import { ZodSchema } from 'zod';
import { ValidationTargets } from 'hono';

export const validate = <
  T extends ZodSchema,
  Target extends keyof ValidationTargets
>(
  target: Target,
  schema: T
) => {
  return honoZValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: result.error.issues[0].message }, 400);
    }
  });
};
