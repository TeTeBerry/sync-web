export type RavenAuthIntent = 'schedule' | 'journey' | 'profile' | 'squad';

export function openRavenAuthModal(intent: RavenAuthIntent, callbackUrl: string) {
  window.dispatchEvent(new CustomEvent('raven:open-auth', {
    detail: { intent, callbackUrl },
  }));
}
