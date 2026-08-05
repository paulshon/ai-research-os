import AuthTopBar from "@/components/auth/auth-topbar";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthTopBar />
      {children}
    </>
  );
}
