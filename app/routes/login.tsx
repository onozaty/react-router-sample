import { getFormProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Form, redirect, useActionData } from "react-router";
import { z } from "zod";
import { Field } from "~/components/field";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { commitSession, getSession } from "~/lib/sessions.server";
import { authenticateUser } from "~/services/auth.service.server";
import { updateLastLogin } from "~/services/user.service.server";
import type { Route } from "./+types/login";

const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export const meta = () => {
  return [{ title: "ログイン" }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  // 既にログインしている場合はリダイレクト
  if (session.has("userId")) {
    return redirect("/");
  }

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: loginSchema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const { email, password } = submission.value;

  // ユーザー認証
  const user = await authenticateUser(email, password);
  if (!user) {
    return submission.reply({
      formErrors: ["メールアドレスまたはパスワードが間違っています"],
    });
  }

  // セッションを作成
  const session = await getSession(request.headers.get("Cookie"));
  session.set("userId", user.userId);
  session.set("email", user.email);

  // 最終ログイン時刻を更新
  await updateLastLogin(user.userId);

  // ログイン後は一律トップページにリダイレクト
  return redirect("/", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export default function Login() {
  const lastResult = useActionData<typeof action>();

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: loginSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">ログイン</h1>
          <p className="text-gray-600">アカウントにログインしてください</p>
        </div>

        <Form method="POST" {...getFormProps(form)}>
          <div className="space-y-4">
            {form.errors && (
              <div className="text-red-600 text-sm">
                {form.errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}

            <Field
              field={fields.email}
              label="メールアドレス"
              type="email"
              placeholder="example@example.com"
            />

            <Field
              field={fields.password}
              label="パスワード"
              type="password"
              placeholder="パスワードを入力"
            />

            <Button type="submit" className="w-full">
              ログイン
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
