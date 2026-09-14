import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";
import { zodResolver } from "@/lib/form";
import { errorMessage, strings } from "@/lib/strings";
import { usernameSchema } from "@/lib/validation";
import { sanitizeRedirect } from "@/components/app/route-guard";
import { AuthLayout } from "@/components/app/auth-layout";
import { PasswordInput } from "@/components/app/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useSystemStatus } from "@/queries/system";

const formSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "请输入密码"),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
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
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "" },
  });

  const expired = searchParams.get("expired") === "1";
  const registrationOpen = statusQuery.data?.registrationOpen ?? false;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { user } = await api.auth.login(values.username, values.password);
      queryClient.setQueryData(["auth", "me"], user);
      navigate(sanitizeRedirect(searchParams.get("redirect")), { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    }
  });

  return (
    <AuthLayout title={strings.auth.login}>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          {expired ? (
            <FieldError>{strings.errors.sessionExpired}</FieldError>
          ) : null}
          <Field>
            <FieldLabel htmlFor="username">{strings.auth.username}</FieldLabel>
            <Input id="username" autoComplete="username" autoFocus {...register("username")} />
            <FieldError errors={[errors.username]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">{strings.auth.password}</FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              {...register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>
          {formError ? <FieldError>{formError}</FieldError> : null}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Spinner /> : null}
            {strings.auth.login}
          </Button>
          {registrationOpen ? (
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/register" className="text-primary underline-offset-4 hover:underline">
                {strings.auth.noAccount}
              </Link>
            </p>
          ) : null}
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
