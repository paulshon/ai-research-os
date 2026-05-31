import { NextResponse } from "next/server";

const ADMIN_EMAIL = "sarangred777@gmail.com";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, message, type } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    // In production, integrate with an email service (SendGrid, Resend, etc.)
    // For now, log the contact and return success
    console.log(`[Contact Form] To: ${ADMIN_EMAIL}`);
    console.log(`[Contact Form] From: ${name} <${email}>`);
    console.log(`[Contact Form] Type: ${type}`);
    console.log(`[Contact Form] Message: ${message}`);

    // TODO: Send email via transactional email service
    // await sendEmail({
    //   to: ADMIN_EMAIL,
    //   subject: `[AI Research OS] ${type === 'university_inquiry' ? 'University 플랜 문의' : '문의'} - ${name}`,
    //   body: `이름: ${name}\n이메일: ${email}\n\n${message}`,
    // });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
