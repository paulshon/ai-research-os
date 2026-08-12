import { NextRequest, NextResponse } from "next/server";

/**
 * Stripe Webhook Endpoint
 * 구독 변경, 결제 완료 등의 이벤트를 처리합니다.
 * TASK 4 (Subscription Platform)에서 구현 예정.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // TODO: TASK 4에서 구현
    // 1. stripe.webhooks.constructEvent(body, signature, webhookSecret)
    // 2. event.type 분기 처리
    //    - checkout.session.completed → 구독 활성화
    //    - customer.subscription.updated → 플랜 변경
    //    - customer.subscription.deleted → 구독 해지
    //    - invoice.payment_failed → 결제 실패 처리

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
