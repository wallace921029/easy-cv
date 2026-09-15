import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";
import { zodResolver } from "@/lib/form";
import { errorMessage, strings } from "@/lib/strings";
import {
  confirmPasswordRefinement,
  getConfirmPasswordIssue,
  getInviteCodeInputSchema,
  getPasswordSchema,
  getUsernameSchema,
} from "@/lib/validation";
import { AuthLayout } from "@/components/app/auth-layout";
import { PasswordInput } from "@/components/app/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useSystemStatus } from "@/queries/system";

const getFormSchema = () =>
  z
    .object({
      username: getUsernameSchema(),
      password: getPasswordSchema(),
      confirmPassword: z.string(),
      inviteCode: getInviteCodeInputSchema(),
    })
    .refine(confirmPasswordRefinement, getConfirmPasswordIssue());

type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const statusQuery = useSystemStatus();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(getFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      inviteCode: searchParams.get("code") ?? "",
    },
  });

  const registrationOpen = statusQuery.data?.registrationOpen ?? false;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { user } = await api.auth.register(values.username, values.password, values.inviteCode);
      queryClient.setQueryData(["auth", "me"], user);
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    }
  });

  if (statusQuery.data && !registrationOpen) {
    return (
      <AuthLayout title={strings.auth.registerTitle}>
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">{strings.auth.registrationClosed}</p>
          <Link to="/login" className="text-sm text-primary underline-offset-4 hover:underline">
            {strings.auth.hasAccount}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={strings.auth.registerTitle}>
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
            <FieldLabel htmlFor="inviteCode">{strings.auth.inviteCode}</FieldLabel>
            <Input id="inviteCode" autoComplete="off" {...register("inviteCode")} />
            <FieldError errors={[errors.inviteCode]} />
          </Field>
          {formError ? <FieldError>{formError}</FieldError> : null}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Spinner /> : null}
            {strings.auth.register}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary underline-offset-4 hover:underline">
              {strings.auth.hasAccount}
            </Link>
          </p>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
