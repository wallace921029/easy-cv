import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/lib/api";
import { zodResolver } from "@/lib/form";
import { errorMessage, strings } from "@/lib/strings";
import { getPasswordSchema } from "@/lib/validation";
import { useTheme, type Theme } from "@/components/app/theme-provider";
import { useI18n, type Language } from "@/components/app/i18n-provider";
import { PageHeader } from "@/components/app/page-header";
import { PasswordInput } from "@/components/app/password-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

const getFormSchema = () =>
  z
    .object({
      currentPassword: z.string().min(1, strings.validation.currentPasswordRequired),
      newPassword: getPasswordSchema(),
      confirmNewPassword: z.string(),
    })
    .refine((v) => v.newPassword === v.confirmNewPassword, {
      path: ["confirmNewPassword"],
      message: strings.validation.passwordMismatch,
    });

type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useI18n();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(getFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  const themeOptions: { value: Theme; label: string }[] = [
    { value: "system", label: strings.settings.themeSystem },
    { value: "light", label: strings.settings.themeLight },
    { value: "dark", label: strings.settings.themeDark },
  ];

  const languageOptions: { value: Language; label: string }[] = [
    { value: "system", label: strings.settings.langSystem },
    { value: "zh", label: strings.settings.langZh },
    { value: "en", label: strings.settings.langEn },
  ];

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.auth.changePassword(values.currentPassword, values.newPassword);
      toast.add({ title: strings.settings.passwordChanged, type: "success" });
      reset();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  });

  return (
    <div className="min-h-screen">
      <PageHeader title={strings.settings.title} />
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>{strings.settings.changePassword}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} noValidate>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="currentPassword">
                    {strings.auth.currentPassword}
                  </FieldLabel>
                  <PasswordInput
                    id="currentPassword"
                    autoComplete="current-password"
                    {...register("currentPassword")}
                  />
                  <FieldError errors={[errors.currentPassword]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="newPassword">{strings.auth.newPassword}</FieldLabel>
                  <PasswordInput
                    id="newPassword"
                    autoComplete="new-password"
                    {...register("newPassword")}
                  />
                  <FieldError errors={[errors.newPassword]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmNewPassword">
                    {strings.auth.confirmNewPassword}
                  </FieldLabel>
                  <PasswordInput
                    id="confirmNewPassword"
                    autoComplete="new-password"
                    {...register("confirmNewPassword")}
                  />
                  <FieldError errors={[errors.confirmNewPassword]} />
                </Field>
                {formError ? <FieldError>{formError}</FieldError> : null}
                <div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Spinner /> : null}
                    {strings.settings.changePasswordSubmit}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{strings.settings.appearance}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as Theme)}
              className="flex flex-wrap gap-4"
            >
              {themeOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-white/40 dark:hover:bg-white/5"
                >
                  <RadioGroupItem value={option.value} />
                  {option.label}
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{strings.settings.language}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={language}
              onValueChange={(value) => setLanguage(value as Language)}
              className="flex flex-wrap gap-4"
            >
              {languageOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-white/40 dark:hover:bg-white/5"
                >
                  <RadioGroupItem value={option.value} />
                  {option.label}
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
