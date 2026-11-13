// Native modal dialogs keep the page below inert. Only a complete backdrop
// gesture dismisses the card; dragging from its content must not close it.
export function installOutsideDismiss(dialog) {
  let pointerId;
  let releasedOutside = false;
  const reset = () => { pointerId = undefined; releasedOutside = false; };
  const outside = event => {
    if (event.target !== dialog) return false;
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom;
  };
  dialog.addEventListener('pointerdown', event => {
    reset();
    if (dialog.open && event.isPrimary && event.button === 0 && outside(event)) pointerId = event.pointerId;
  });
  dialog.addEventListener('pointerup', event => {
    releasedOutside = pointerId !== undefined && event.pointerId === pointerId && outside(event);
  });
  dialog.addEventListener('pointercancel', reset);
  dialog.addEventListener('close', reset);
  dialog.addEventListener('click', event => {
    const dismiss = dialog.open && releasedOutside && event.button === 0 && outside(event);
    reset();
    if (!dismiss) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    dialog.close();
  }, true);
}

export function installMenuOutsideDismiss(root) {
  let consumeClick = false;
  let activeMenu;
  root.addEventListener('pointerdown', event => {
    consumeClick = false;
    // Some browsers close their native popup before delivering the outside
    // pointerdown. Remember the select observed open after its opening click.
    const menu = root.querySelector('select:open') ?? activeMenu;
    if (!menu || menu.contains(event.target)) return;
    activeMenu = undefined;
    consumeClick = true;
    event.preventDefault();
    event.stopImmediatePropagation();
    menu.blur();
  }, true);
  root.addEventListener('pointercancel', () => { consumeClick = false; }, true);
  root.addEventListener('keyup', () => { activeMenu = root.querySelector('select:open'); }, true);
  root.addEventListener('change', event => {
    if (event.target === activeMenu) activeMenu = undefined;
  }, true);
  root.addEventListener('click', event => {
    if (!consumeClick) {
      activeMenu = root.querySelector('select:open');
      return;
    }
    consumeClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}
