import { z } from "zod";
import { baseEntitySchema } from "./base.schema";

export const userSchema = baseEntitySchema.extend({
  name: z.string()
});
