// tel:/sms: links are picky about stray formatting characters like parens
// and dashes in some clients, so strip everything but digits and a leading +.
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function smsHref(phone: string): string {
  return `sms:${phone.replace(/[^\d+]/g, '')}`;
}

export function mailtoHref(email: string): string {
  return `mailto:${email}`;
}
