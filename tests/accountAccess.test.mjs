import assert from 'node:assert/strict';
import test from 'node:test';
import { watchAccountAccess } from '../src/accountAccess.ts';

const alice = { uid: 'alice', email: 'ALICE@example.com', emailVerified: true };
const bob = { uid: 'bob', email: 'bob@example.com', emailVerified: true };
const settle = () => new Promise(setImmediate);

function setup() {
  let onUser;
  let unsubscribed = false;
  const states = [];
  const requests = [];
  const stop = watchAccountAccess({
    subscribe(callback) {
      onUser = callback;
      return () => { unsubscribed = true; };
    },
    readRecord(collection, email) {
      return new Promise((resolve, reject) => requests.push({ collection, email, resolve, reject }));
    },
    publish: (state) => states.push(state),
  });
  return { states, requests, stop, change: (user) => onUser(user), unsubscribed: () => unsubscribed };
}

test('waits for delayed admin lookup before publishing an admin dashboard', async () => {
  const session = setup();
  session.change(alice);
  assert.ok(session.requests.every((request) => request.email === 'alice@example.com'));
  session.requests[0].resolve({ nickname: 'alice' });
  await settle();
  assert.deepEqual(session.states, [{ status: 'loading' }]);
  session.requests[1].resolve({ enabled: true });
  await settle();
  assert.deepEqual(session.states.at(-1), { status: 'ready', nickname: 'alice', isAdmin: true });
  session.stop();
});

test('missing admin record allows a member dashboard without admin privileges', async () => {
  const session = setup();
  session.change(alice);
  session.requests[0].resolve({ nickname: 'alice' });
  session.requests[1].resolve(undefined);
  await settle();
  assert.deepEqual(session.states.at(-1), { status: 'ready', nickname: 'alice', isAdmin: false });
  session.stop();
});

test('failed admin lookup shows an error and a later check can recover', async (context) => {
  context.mock.method(console, 'error', () => {});
  const session = setup();
  session.change(alice);
  session.requests[0].resolve({ nickname: 'alice' });
  session.requests[1].reject(new Error('network unavailable'));
  await settle();
  assert.equal(session.states.at(-1).status, 'error');
  assert.ok(!session.states.some((state) => state.status === 'ready'));
  session.change(alice);
  session.requests[2].resolve({ nickname: 'alice' });
  session.requests[3].resolve({ enabled: true });
  await settle();
  assert.equal(session.states.at(-1).isAdmin, true);
  session.stop();
});

test('logout ignores an earlier in-flight admin lookup', async () => {
  const session = setup();
  session.change(alice);
  session.change(null);
  session.requests[0].resolve({ nickname: 'alice' });
  session.requests[1].resolve({ enabled: true });
  await settle();
  assert.deepEqual(session.states.at(-1), { status: 'signedOut' });
  assert.ok(!session.states.some((state) => state.status === 'ready'));
  session.stop();
});

test('an old account lookup cannot overwrite the newly signed-in account', async () => {
  const session = setup();
  session.change(alice);
  session.change(bob);
  session.requests[2].resolve({ nickname: 'bob' });
  session.requests[3].resolve({ enabled: true });
  await settle();
  session.requests[0].resolve({ nickname: 'alice' });
  session.requests[1].resolve(undefined);
  await settle();
  assert.deepEqual(session.states.at(-1), { status: 'ready', nickname: 'bob', isAdmin: true });
  session.stop();
});

test('cleanup prevents stale lookups from updating a remounted app', async () => {
  const session = setup();
  session.change(alice);
  session.stop();
  session.requests[0].resolve({ nickname: 'alice' });
  session.requests[1].resolve({ enabled: true });
  await settle();
  assert.equal(session.unsubscribed(), true);
  assert.deepEqual(session.states, [{ status: 'loading' }]);
});

test('admin documents do not grant access without approved membership', async () => {
  const session = setup();
  session.change(alice);
  session.requests[0].resolve(undefined);
  session.requests[1].resolve({ enabled: true });
  await settle();
  assert.equal(session.states.at(-1).status, 'denied');
  session.stop();
});

test('unverified accounts do not load membership or admin records', () => {
  const session = setup();
  session.change({ ...alice, emailVerified: false });
  assert.equal(session.states.at(-1).status, 'denied');
  assert.equal(session.requests.length, 0);
  session.stop();
});

test('unapproved accounts see the member-list message even when admin reads are denied', async () => {
  const session = setup();
  session.change(alice);
  session.requests[0].resolve(undefined);
  session.requests[1].reject(new Error('permission-denied'));
  await settle();
  assert.equal(session.states.at(-1).status, 'denied');
  session.stop();
});
