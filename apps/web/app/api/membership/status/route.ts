import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getMembershipProfile } from "@/lib/membership-server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getMembershipProfile(userId);
  if (!profile) {
    return NextResponse.json(
      {
        approval_status: "pending",
        is_special_member: false,
        name: "",
      },
      { status: 200 }
    );
  }

  return NextResponse.json(profile);
}
