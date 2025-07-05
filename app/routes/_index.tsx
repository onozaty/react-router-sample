import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/_index";

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
};

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <Button asChild>
        <Link to="/users">ユーザー一覧</Link>
      </Button>
    </div>
  );
}
