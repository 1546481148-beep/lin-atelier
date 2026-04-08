import { AdminEmailLoginPanel } from "../../../components/admin-email-login-panel";
import { signInWithPassword } from "../actions";
import { getSessionUser } from "../../../lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const errorMap = {
  "missing-fields": "邮箱和密码都需要填写。",
  "invalid-credentials": "邮箱或密码不正确，请重新输入。",
};

export const metadata = {
  title: "后台登录",
  description: "使用邮箱和密码进入这个站的后台。",
};

export default async function AdminLoginPage({ searchParams }) {
  const currentUser = await getSessionUser();

  if (currentUser) {
    redirect("/admin");
  }

  const query = await searchParams;
  const errorMessage = errorMap[query?.error] ?? null;

  return (
    <AdminEmailLoginPanel
      errorMessage={errorMessage}
      signInAction={signInWithPassword}
    />
  );
}
