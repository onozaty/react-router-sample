import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { getAllUsers } from "~/services/user.service.server";
import type { Route } from "./+types/users._index";

export const loader = async ({}: Route.LoaderArgs) => {
  const users = await getAllUsers();
  return { users };
};

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "ユーザー管理" },
    { name: "description", content: "ユーザーの一覧・管理画面" },
  ];
};

export default function Users({ loaderData }: Route.ComponentProps) {
  const { users } = loaderData;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">ユーザー管理</h1>
          <p className="text-muted-foreground">ユーザーの一覧・管理</p>
        </div>
        <Button asChild>
          <Link to="/users/new">新規ユーザー登録</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
          <CardDescription>登録されているユーザーの一覧です</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                ユーザーが登録されていません
              </p>
              <Button asChild className="mt-4">
                <Link to="/users/new">最初のユーザーを登録</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>ユーザー名</TableHead>
                  <TableHead>作成日時</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium">{user.userId}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.username || "-"}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/users/${user.userId}/edit`}>編集</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
