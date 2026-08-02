import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canRoleAccessPath,
  isAdminRole,
  isProtectedAppPath,
  isPublicAppPath,
  roleHome,
} from './authz';

test('public marketing and auth routes remain public', () => {
  assert.equal(isPublicAppPath('/'), true);
  assert.equal(isPublicAppPath('/demo'), true);
  assert.equal(isPublicAppPath('/api/cron/tuition-reminders'), true);
  assert.equal(isPublicAppPath('/admin'), false);
});

test('sensitive role prefixes are protected', () => {
  assert.equal(isProtectedAppPath('/admin/tuition'), true);
  assert.equal(isProtectedAppPath('/teacher/example/attendance'), true);
  assert.equal(isProtectedAppPath('/parent/example'), true);
  assert.equal(isProtectedAppPath('/pricing'), false);
});

test('role guards do not allow cross-persona access', () => {
  assert.equal(canRoleAccessPath('principal', '/admin/tuition'), true);
  assert.equal(canRoleAccessPath('admin', '/admin/students'), true);
  assert.equal(canRoleAccessPath('teacher', '/admin/students'), false);
  assert.equal(canRoleAccessPath('parent', '/teacher/class-id'), false);
  assert.equal(canRoleAccessPath('teacher', '/teacher/class-id'), true);
  assert.equal(canRoleAccessPath('parent', '/parent/student-id'), true);
});

test('role homes and privileged roles are explicit', () => {
  assert.equal(roleHome('teacher'), '/teacher');
  assert.equal(roleHome('parent'), '/parent');
  assert.equal(roleHome('principal'), '/admin');
  assert.equal(isAdminRole('principal'), true);
  assert.equal(isAdminRole('admin'), true);
  assert.equal(isAdminRole('teacher'), false);
});
