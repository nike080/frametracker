import test from 'node:test';
import assert from 'node:assert/strict';
import { installOutsideDismiss, installMenuOutsideDismiss } from '../public/outside-dismiss.js';

function fixture() {
  const dialog = new EventTarget();
  dialog.open = true;
  dialog.closed = 0;
  dialog.getBoundingClientRect = () => ({ left: 100, top: 100, right: 500, bottom: 600 });
  dialog.close = () => { dialog.open = false; dialog.closed++; dialog.dispatchEvent(new Event('close')); };
  installOutsideDismiss(dialog);
  const send = (type, values = {}) => {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries({ clientX: 50, clientY: 200, pointerId: 1, isPrimary: true, button: 0, ...values }))
      Object.defineProperty(event, key, { value });
    dialog.dispatchEvent(event);
    return event;
  };
  return { dialog, send };
}

test('complete backdrop click closes once and consumes the click', () => {
  const { dialog, send } = fixture();
  let lowerListener = false;
  dialog.addEventListener('click', () => { lowerListener = true; });
  send('pointerdown'); send('pointerup');
  assert.ok(send('click').defaultPrevented);
  assert.equal(dialog.closed, 1);
  assert.equal(lowerListener, false);
});

test('interior padding, content, and inside/outside drags do not dismiss', () => {
  for (const [down, up, click] of [
    [{ clientX: 200 }, { clientX: 200 }, { clientX: 200 }],
    [{ target: {} }, {}, {}],
    [{ clientX: 200 }, {}, {}],
    [{}, { clientX: 200 }, { clientX: 200 }],
    [{ clientX: 500 }, { clientX: 500 }, { clientX: 500 }],
  ]) {
    const { dialog, send } = fixture();
    send('pointerdown', down); send('pointerup', up); send('click', click);
    assert.equal(dialog.closed, 0);
  }
});

test('opening click, right click, cancellation, and unmatched pointers do not dismiss', () => {
  for (const scenario of [
    send => send('click'),
    send => { send('pointerdown', { button: 2 }); send('pointerup'); send('click'); },
    send => { send('pointerdown', { isPrimary: false }); send('pointerup'); send('click'); },
    send => { send('pointerdown'); send('pointercancel'); send('pointerup'); send('click'); },
    send => { send('pointerdown'); send('pointerup', { pointerId: 2 }); send('click'); },
  ]) {
    const { dialog, send } = fixture();
    scenario(send);
    assert.equal(dialog.closed, 0);
  }
});

test('close resets gesture state before reopening', () => {
  const { dialog, send } = fixture();
  send('pointerdown'); send('pointerup');
  dialog.close(); dialog.open = true;
  send('click');
  assert.equal(dialog.closed, 1);
  send('pointerdown'); send('pointerup'); send('click');
  assert.equal(dialog.closed, 2);
});

test('native menu consumes only the first outside click even if browser closes it before pointerdown', () => {
  const root = new EventTarget();
  let menuOpen = true;
  const menu = { contains: target => target === menu, blur: () => { menuOpen = false; } };
  root.querySelector = () => menuOpen ? menu : null;
  installMenuOutsideDismiss(root);
  root.dispatchEvent(new Event('click')); // Opening click observes the open menu.
  menuOpen = false; // Native popup closes before the page receives pointerdown.
  const down = new Event('pointerdown', { cancelable: true });
  root.dispatchEvent(down);
  assert.ok(down.defaultPrevented);
  const first = new Event('click', { cancelable: true });
  root.dispatchEvent(first);
  assert.ok(first.defaultPrevented);
  root.dispatchEvent(new Event('pointerdown'));
  const second = new Event('click', { cancelable: true });
  root.dispatchEvent(second);
  assert.ok(!second.defaultPrevented);
});

test('keyboard dismissal and selecting an option clear native menu tracking', () => {
  for (const type of ['keyup', 'change', 'click']) {
    const root = new EventTarget();
    let menuOpen = true;
    const menu = { contains: () => false, blur: () => {} };
    root.querySelector = () => menuOpen ? menu : null;
    installMenuOutsideDismiss(root);
    root.dispatchEvent(new Event('click'));
    menuOpen = false;
    const closeEvent = new Event(type);
    if (type === 'change') Object.defineProperty(closeEvent, 'target', { value: menu });
    root.dispatchEvent(closeEvent);
    const outside = new Event('pointerdown', { cancelable: true });
    root.dispatchEvent(outside);
    assert.ok(!outside.defaultPrevented, type);
  }
});
