/* ============================================
   Tasktics - Drag & drop
   Exposes: window.DragDrop
   Depends: window.State (runtime), window.App (runtime)
   ============================================ */

(function () {
  'use strict';

  let _drag = null;
  let _dragPending = null;

  function setPending(data) {
    _dragPending = data;
  }

  function removePlaceholder() {
    document.getElementById('dnd-placeholder')?.remove();
  }

  function getOrCreatePlaceholder(height) {
    let ph = document.getElementById('dnd-placeholder');
    if (!ph) {
      ph = document.createElement('div');
      ph.id = 'dnd-placeholder';
      ph.className = 'dnd-placeholder';
    }
    if (height) ph.style.height = height + 'px';
    return ph;
  }

  function updatePlaceholder(col, clientY) {
    const { card } = _drag;
    const otherCards = [...col.querySelectorAll('.strip-card')].filter(c => c !== card);

    let insertBeforeEl = null;
    for (const c of otherCards) {
      const r = c.getBoundingClientRect();
      if (clientY < r.top + r.height / 2) { insertBeforeEl = c; break; }
    }

    const ph = getOrCreatePlaceholder(card.offsetHeight);
    if (ph.parentElement !== col || ph.nextElementSibling !== insertBeforeEl) {
      if (insertBeforeEl) {
        col.insertBefore(ph, insertBeforeEl);
      } else {
        const lastCard = otherCards.at(-1);
        lastCard ? lastCard.insertAdjacentElement('afterend', ph) : col.prepend(ph);
      }
    }
  }

  function startDrag(e) {
    const { taskId, card, offsetX, offsetY } = _dragPending;
    _dragPending = null;

    const rect = card.getBoundingClientRect();

    const clone = card.cloneNode(true);
    Object.assign(clone.style, {
      position:      'fixed',
      left:          rect.left + 'px',
      top:           rect.top + 'px',
      width:         rect.width + 'px',
      margin:        '0',
      zIndex:        '9999',
      pointerEvents: 'none',
      opacity:       '0.92',
      boxShadow:     '0 12px 32px rgba(0,0,0,0.55)',
      transform:     'rotate(1.2deg) scale(1.03)',
      transition:    'transform 0.08s ease, box-shadow 0.08s ease',
    });
    document.body.appendChild(clone);

    card.classList.add('dragging');
    document.body.style.cursor     = 'grabbing';
    document.body.style.userSelect = 'none';

    _drag = { taskId, card, clone, offsetX, offsetY, currentCol: null };
  }

  function moveDrag(e) {
    const { clone, offsetX, offsetY } = _drag;

    clone.style.left = (e.clientX - offsetX) + 'px';
    clone.style.top  = (e.clientY - offsetY) + 'px';

    const col = document.elementFromPoint(e.clientX, e.clientY)?.closest('.column-body');
    _drag.currentCol = col || null;

    if (col) {
      updatePlaceholder(col, e.clientY);
    } else {
      removePlaceholder();
    }
  }

  function endDrag() {
    const { taskId, card, clone, currentCol } = _drag;
    _drag = null;

    clone.remove();
    card.classList.remove('dragging');
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';

    const ph   = document.getElementById('dnd-placeholder');
    const task = State.tasks.find(t => t.id === taskId);

    if (task && ph && currentCol && ph.parentElement === currentCol) {
      const newStatus     = currentCol.dataset.status;
      const statusChanged = task.status !== newStatus;

      const newOrder = [...currentCol.children].flatMap(node => {
        if (node === ph)   return [taskId];
        if (node === card) return [];
        return node.classList.contains('strip-card') ? [node.dataset.id] : [];
      });

      if (statusChanged) task.status = newStatus;
      newOrder.forEach((id, i) => {
        const t = State.tasks.find(x => x.id === id);
        if (t) t.sortOrder = i;
      });
      if (statusChanged && newStatus === 'cleared') State.spawnNextRecurrence(task);
      State.saveData();
    }

    ph?.remove();
    window.App.render();
  }

  function cancelDrag() {
    if (!_drag) return;
    const { card, clone } = _drag;
    _drag = null;
    clone.remove();
    card.classList.remove('dragging');
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
    removePlaceholder();
  }

  function setupDragDrop() {
    document.addEventListener('mousemove', (e) => {
      if (_dragPending) {
        if (Math.hypot(e.clientX - _dragPending.startX, e.clientY - _dragPending.startY) > 5) {
          startDrag(e);
        }
        return;
      }
      if (_drag) moveDrag(e);
    });

    document.addEventListener('mouseup', () => {
      _dragPending = null;
      if (_drag) endDrag();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { _dragPending = null; cancelDrag(); }
    });
  }

  // ---- EXPORT ----
  window.DragDrop = {
    setPending,
    setupDragDrop,
  };
})();
