import type { NewsDef } from '../types';
import { UI } from './data';

/** Stable opener for a headline — hash of yaml `id`, not `random()`. */
export function newsLeadIn(id: string): string {
  const leads = UI.newsLeadIns;
  if (leads.length === 0) return '';
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return leads[h % leads.length]!;
}

/** Strip legacy wire-service prefix from yaml authoring. */
export function newsBody(text: string): string {
  return text.replace(/^Industry:\s*/, '');
}

/** Full log line: AI trope lead-in + headline body. */
export function formatNewsText(item: Pick<NewsDef, 'id' | 'text'>): string {
  return newsLeadIn(item.id) + newsBody(item.text);
}
