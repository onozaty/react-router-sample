import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Form, Link, redirect } from "react-router";
import { z } from "zod";
import { Field } from "~/components/field";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  checkEmailExists,
  deleteUser,
  getUserById,
  updateUser,
} from "~/services/user.service.server";
import type { Route } from "./+types/users.$id.edit";

const updateUserSchema = z
  .object({
    email: z.string().email("有効なメールアドレスを入力してください"),
    username: z.string().optional(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password || data.confirmPassword) {
        return (
          data.password === data.confirmPassword &&
          (data.password?.length ?? 0) >= 6
        );
      }
      return true;
    },
    {
      message:
        "パスワードは6文字以上で、確認用パスワードと一致している必要があります",
      path: ["confirmPassword"],
    },
  );

export const loader = async ({ params }: Route.LoaderArgs) => {
  const userId = parseInt(params.id);
  if (isNaN(userId)) {
    throw new Response("Invalid user ID", { status: 400 });
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new Response("User not found", { status: 404 });
  }

  return { user };
};

export const action = async ({ request, params }: Route.ActionArgs) => {
  const userId = parseInt(params.id);
  if (isNaN(userId)) {
    throw new Response("Invalid user ID", { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "delete") {
    await deleteUser(userId);
    return redirect("/users");
  }

  const submission = parseWithZod(formData, { schema: updateUserSchema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const { email, username, password } = submission.value;

  // メールアドレスの重複チェック
  const emailExists = await checkEmailExists(email, userId);
  if (emailExists) {
    return submission.reply({
      fieldErrors: {
        email: ["このメールアドレスは既に使用されています"],
      },
    });
  }

  await updateUser(userId, {
    email,
    username: username || undefined,
    password: password || undefined,
  });

  return redirect("/users");
};

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "ユーザー編集" },
    { name: "description", content: "ユーザー情報の編集" },
  ];
};

export default function EditUser({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { user } = loaderData;
  const [form, fields] = useForm({
    lastResult: actionData,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: updateUserSchema });
    },
    shouldRevalidate: "onBlur",
    defaultValue: {
      email: user.email,
      username: user.username || "",
      password: "",
      confirmPassword: "",
    },
  });

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">ユーザー編集</h1>
          <p className="text-muted-foreground">ユーザー情報を編集します</p>
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
                placeholder="変更する場合のみ入力"
              />

              <Field
                field={fields.confirmPassword}
                label="パスワード確認"
                type="password"
                placeholder="パスワードを変更する場合は確認用も入力"
              />

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  更新
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/users">キャンセル</Link>
                </Button>
              </div>
            </Form>

            <div className="mt-6 pt-6 border-t">
              <Form method="post">
                <input type="hidden" name="intent" value="delete" />
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full"
                  onClick={(e) => {
                    if (!confirm("本当にこのユーザーを削除しますか？")) {
                      e.preventDefault();
                    }
                  }}
                >
                  ユーザーを削除
                </Button>
              </Form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
