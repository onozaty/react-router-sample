import { Link, Form } from "react-router";
import { Button } from "./ui/button";
import type { AuthUser } from "~/services/auth.service.server";

interface HeaderProps {
  user: AuthUser | null;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-semibold text-gray-900">
              React Router Sample
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-700">
                  こんにちは、{user.username || user.email}さん
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link to="/users">ユーザー一覧</Link>
                </Button>
                <Form method="post" action="/logout">
                  <Button type="submit" variant="outline" size="sm">
                    ログアウト
                  </Button>
                </Form>
              </>
            ) : (
              <Button asChild size="sm">
                <Link to="/login">ログイン</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
