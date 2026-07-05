import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createWaitlistSubmission, findWaitlistContact } from '../../../lib/waitlist';
import { DEFAULT_LOCALE, normalizeLocale } from '../../../lib/i18n';

const TO_EMAIL = 'czy250714751cn@sina.cn';
const FROM_EMAIL = 'noreply@raven-festival.com';

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readEventLegacyId(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(request: Request) {
  let locale = DEFAULT_LOCALE;

  try {
    const payload = await request.json();
    const email = readText(payload.email);
    const event = readText(payload.event);
    const note = readText(payload.note);
    const sourcePath = readText(payload.sourcePath);
    locale = normalizeLocale(readText(payload.locale) || undefined);
    const userAgent = request.headers.get('user-agent')?.trim() ?? '';

    if (!email && !note) {
      const error =
        locale === 'en' ? 'Enter at least one field.' : '请至少填写一项';
      return NextResponse.json({ error, code: 'validation' }, { status: 400 });
    }

    if (email) {
      const existing = await findWaitlistContact(email);
      if (existing) {
        const error =
          locale === 'en'
            ? 'This contact is already on the waitlist.'
            : '该联系方式已提交过申请';
        return NextResponse.json({ error, code: 'duplicate' }, { status: 409 });
      }
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
        subject: `[RAVEN内测] 新的加入请求`,
        text: body,
      });
    } else {
      console.log('[waitlist]', { event, sourcePath, timestamp: new Date().toISOString() });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[waitlist] send failed:', error);
    const message =
      locale === 'en' ? 'Unable to submit. Please try again.' : '提交失败，请稍后重试';
    return NextResponse.json({ error: message, code: 'server' }, { status: 500 });
  }
}
