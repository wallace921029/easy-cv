import type { FieldErrors, FieldValues, Path, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

// D10: a dozen-line zod resolver instead of @hookform/resolvers.
export function zodResolver<T extends FieldValues>(
  schemaOrFactory: ZodType<T> | (() => ZodType<T>),
): Resolver<T> {
  return async (values) => {
    const schema = typeof schemaOrFactory === "function" ? schemaOrFactory() : schemaOrFactory;
    const parsed = schema.safeParse(values);
    if (parsed.success) {
      return { values: parsed.data, errors: {} };
    }
    const errors = {} as FieldErrors<T>;
    for (const issue of parsed.error.issues) {
      const key = (issue.path.join(".") || "root") as Path<T>;
      if (!errors[key]) {
        (errors as Record<string, unknown>)[key] = {
          type: issue.code,
          message: issue.message,
        };
      }
    }
    return { values: {}, errors };
  };
}
