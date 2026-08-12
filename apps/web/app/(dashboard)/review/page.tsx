"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReviewRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/validation");
  }, [router]);
  return null;
}
