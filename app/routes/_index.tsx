import { Link, useLoaderData } from "react-router";
import { Button } from "~/components/ui/button";
import { authUserContext } from "~/services/auth.service.server";
import type { Route } from "./+types/_index";

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
};

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(authUserContext);
  return {
    user,
  };
}

export default function Home() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Welcome!</h1>

      {user ? (
        <div className="text-center space-y-4">
          <p>こんにちは、{user.email}さん！</p>
          <div className="flex gap-4">
            <Button asChild>
              <Link to="/users">ユーザー一覧</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <p>ログインしてください</p>
          <Button asChild>
            <Link to="/login">ログイン</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
