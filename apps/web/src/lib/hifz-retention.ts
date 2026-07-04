// Retention flags for hifz progress — computed on read, no extra storage.
// Window is 21 days ("X weeks" = 3 weeks) for "no review"/"no update" flags.
const RETENTION_WINDOW_DAYS = 21;

export function getHifzRetentionFlags(hifz: { sessionDate: string; stream: string; status: string }[]) {
  if (hifz.length === 0) {
    return { noReviewInWeeks: false, repeatedWeak: false, noUpdateInWeeks: false };
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_WINDOW_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const noUpdateInWeeks = hifz[0]!.sessionDate < cutoffStr;
  const noReviewInWeeks = !hifz.some(h => (h.stream === 'sabqi' || h.stream === 'manzil') && h.sessionDate >= cutoffStr);
  const lastThree = hifz.slice(0, 3);
  const weakCount = lastThree.filter(h => h.status === 'weak' || h.status === 'needs_review').length;
  const repeatedWeak = lastThree.length >= 2 && weakCount >= 2;

  return { noReviewInWeeks, repeatedWeak, noUpdateInWeeks };
}
