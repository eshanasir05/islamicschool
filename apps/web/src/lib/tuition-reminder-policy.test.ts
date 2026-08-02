import assert from 'node:assert/strict';
import test from 'node:test';
import { isTuitionReminderDue, tuitionReminderCutoff } from './tuition-reminder-policy';

const now = new Date('2026-08-02T16:00:00.000Z');

test('a family with no prior reminder is eligible', () => {
  assert.equal(isTuitionReminderDue(null, now, 7), true);
});

test('the scheduled reminder remains throttled for seven days', () => {
  assert.equal(isTuitionReminderDue('2026-07-30T16:00:00.000Z', now, 7), false);
  assert.equal(isTuitionReminderDue('2026-07-20T16:00:00.000Z', now, 7), true);
  assert.equal(tuitionReminderCutoff(now, 7).toISOString(), '2026-07-26T16:00:00.000Z');
});
