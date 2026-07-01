import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const TO_EMAIL = 'czy250714751cn@sina.cn';
const FROM_EMAIL = 'noreply@sync-festival.com';

export async function POST(request: Request) {
  try {
    const { email, event, note } = await request.json();

    if (!email?.trim() && !note?.trim()) {
      return NextResponse.json({ error: '请至少填写一项' }, { status: 400 });
    }

    const body = [
      `邮箱/微信: ${email || '未填写'}`,
      `关注活动: ${event || '未指定'}`,
      `备注: ${note || '未填写'}`,
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
      // Fallback: log to console so Vercel Logs captures it
      console.log('[waitlist]', { email, event, note, timestamp: new Date().toISOString() });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[waitlist] send failed:', error);
    return NextResponse.json({ error: '发送失败，请稍后重试' }, { status: 500 });
  }
}
