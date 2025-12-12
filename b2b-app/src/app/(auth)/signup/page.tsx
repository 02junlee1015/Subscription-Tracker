import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignupForm } from "./ui";

export default function SignupPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Request access</CardTitle>
          <CardDescription>
            Submit your email. An admin must approve before you can log in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
      </Card>
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Already approved?{" "}
        <Link className="underline" href="/login">
          Login
        </Link>
      </p>
    </div>
  );
}

