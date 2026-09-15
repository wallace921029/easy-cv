import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";
import { zodResolver } from "@/lib/form";
import { errorMessage, strings } from "@/lib/strings";
import {
  confirmPasswordIssue,
  confirmPasswordRefinement,
  initCodeInputSchema,
  passwordSchema,
  usernameSchema,
} from "@/lib/validation";
import { AuthLayout } from "@/components/app/auth-layout";
import { PasswordInput } from "@/components/app/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const formSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    initCode: initCodeInputSchema,
  })
  .refine(confirmPasswordRefinement, confirmPasswordIssue);

type FormValues = z.infer<typeof formSchema>;

export default function SetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "", confirmPassword: "", initCode: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { user } = await api.auth.setup(values.username, values.password, values.initCode);
      queryClient.setQueryData(["auth", "me"], user);
      await queryClient.invalidateQueries({ queryKey: ["system"] });
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    }
  });

  return (
    <AuthLayout title={strings.auth.setupTitle}>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="username">{strings.auth.username}</FieldLabel>
            <Input id="username" autoComplete="username" autoFocus {...register("username")} />
            <FieldError errors={[errors.username]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">{strings.auth.password}</FieldLabel>
            <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
            <FieldError errors={[errors.password]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirmPassword">{strings.auth.confirmPassword}</FieldLabel>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            <FieldError errors={[errors.confirmPassword]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="initCode">{strings.auth.initCode}</FieldLabel>
            <Input id="initCode" autoComplete="off" {...register("initCode")} />
            <FieldError errors={[errors.initCode]} />
          </Field>
          {formError ? <FieldError>{formError}</FieldError> : null}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Spinner /> : null}
            {strings.auth.setupSubmit}
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
