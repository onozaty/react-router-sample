import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Form, Link, redirect } from "react-router";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Field } from "~/components/field";
import { checkEmailExists, createUser } from "~/services/user.service.server";
import type { Route } from "./+types/users.new";

const createUserSchema = z
  .object({
    email: z.string().email("有効なメールアドレスを入力してください"),
    username: z.string().optional(),
    password: z.string().min(6, "パスワードは6文字以上で入力してください"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: createUserSchema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const { email, username, password } = submission.value;

  // メールアドレスの重複チェック
  const emailExists = await checkEmailExists(email);
  if (emailExists) {
    return submission.reply({
      fieldErrors: {
        email: ["このメールアドレスは既に使用されています"],
      },
    });
  }

  await createUser({
    email,
    username: username || null,
    password,
  });

  return redirect("/users");
};

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "ユーザー登録" },
    { name: "description", content: "新規ユーザーの登録" },
  ];
};

export default function NewUser({ actionData }: Route.ComponentProps) {
  const [form, fields] = useForm({
    lastResult: actionData,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: createUserSchema });
    },
    shouldRevalidate: "onBlur",
  });

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">ユーザー登録</h1>
          <p className="text-muted-foreground">新しいユーザーを登録します</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ユーザー情報</CardTitle>
            <CardDescription>必要な情報を入力してください</CardDescription>
          </CardHeader>
          <CardContent>
            <Form
              method="post"
              id={form.id}
              onSubmit={form.onSubmit}
              noValidate
              className="space-y-4"
            >
              <Field
                field={fields.email}
                label="メールアドレス"
                type="email"
                required
              />

              <Field field={fields.username} label="ユーザー名" type="text" />

              <Field
                field={fields.password}
                label="パスワード"
                type="password"
                required
              />

              <Field
                field={fields.confirmPassword}
                label="パスワード確認"
                type="password"
                required
              />

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  登録
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/users">キャンセル</Link>
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
