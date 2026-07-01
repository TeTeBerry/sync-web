import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createWaitlistSubmission } from '../../../lib/waitlist';

const TO_EMAIL = 'czy250714751cn@sina.cn';
const FROM_EMAIL = 'noreply@sync-festival.com';

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readEventLegacyId(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const email = readText(payload.email);
    const event = readText(payload.event);
    const note = readText(payload.note);
    const sourcePath = readText(payload.sourcePath);
    const locale = readText(payload.locale) || 'zh';
    const userAgent = request.headers.get('user-agent')?.trim() ?? '';

    if (!email && !note) {
      return NextResponse.json({ error: '请至少填写一项' }, { status: 400 });
    }

    await createWaitlistSubmission({
      contact: email || '未填写',
      eventLegacyId: readEventLegacyId(event),
      note,
      sourcePath,
      userAgent,
      locale,
    });

    const body = [
      `邮箱/微信: ${email || '未填写'}`,
      `关注活动: ${event || '未指定'}`,
      `备注: ${note || '未填写'}`,
      `来源: ${sourcePath || '未记录'}`,
      `语言: ${locale}`,
    ].join('\n');

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM_EMAIL,
        to: TO_EMAIL,
        subject: `[SYNC内测] 新的加入请求`,
        text: body,
      });
    } else {
      console.log('[waitlist]', { event, sourcePath, timestamp: new Date().toISOString() });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[waitlist] send failed:', error);
    return NextResponse.json({ error: '发送失败，请稍后重试' }, { status: 500 });
  }
}
