/* ══════════════════════════════════════════════════════════════════════
   ove-1 · svix 타입 보강

   svix 1.94.0 배포본에는 dist/webhook.js 만 있고 dist/webhook.d.ts 가 빠져 있다.
   그래서 index.d.ts 의 `export * from "./webhook"` 이 아무 타입도 내보내지 못하고
   `Module '"svix"' has no exported member 'Webhook'` 로 프로덕션 빌드가 멈춘다.
   런타임에는 정상 존재하는 클래스이므로, 타입만 여기서 보강한다.
   (상위 버전에서 d.ts 가 복구되면 이 파일은 지워도 된다)
   ══════════════════════════════════════════════════════════════════════ */

declare module "svix" {
  export class Webhook {
    constructor(secret: string | Uint8Array);
    verify(payload: string | Buffer, headers: Record<string, string>): unknown;
    sign(msgId: string, timestamp: Date, payload: string): Promise<string>;
  }
  export class WebhookVerificationError extends Error {}
}
