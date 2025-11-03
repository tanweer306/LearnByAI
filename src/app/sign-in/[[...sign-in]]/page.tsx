import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background"
      data-oid="q49pxfm"
    >
      <SignIn data-oid="a:wwjyc" />
    </div>
  );
}
