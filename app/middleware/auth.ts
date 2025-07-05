import type { unstable_MiddlewareFunction } from "react-router";
import { redirect } from "react-router";
import { getAuthUser, authUserContext } from "~/services/auth.service.server";

export const authMiddleware: unstable_MiddlewareFunction = async (
  { request, context },
  next,
) => {
  const authUser = await getAuthUser(request);
  context.set(authUserContext, authUser);

  const url = new URL(request.url);
  const pathname = url.pathname;

  // 認証が必要なページで未認証の場合
  // ログイン画面にリダイレクト
  if (pathname !== "/login" && pathname !== "/logout" && !authUser) {
    throw redirect(`/login`);
  }
  return next();
};
