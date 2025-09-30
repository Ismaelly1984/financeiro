// modal.js
// Módulo reutilizável para focus-trap em modais (edição / confirmação)
import * as dom from './dom.js';

export function initModalFocusTrap() {
  const modalEditar = dom.modalEditar;
  const modalConfirm = dom.modalConfirmacao;
  const modals = [modalEditar, modalConfirm].filter(Boolean);
  if (!modals.length) return;

  function getFocusable(container) {
    return Array.from(container.querySelectorAll(
      'a[href], area[href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  const state = new Map();

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) !== 0 && el.offsetParent !== null;
  }

  function activate(modal) {
    if (state.get(modal)) return;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.removeAttribute('aria-hidden');

    const prev = document.activeElement;
    state.set(modal, { prev });

    const focusables = getFocusable(modal);
    const first = focusables[0] || modal;
    const last = focusables[focusables.length - 1] || modal;

    // Garante que o título do modal possa receber foco para leitores de tela
    const titleEl = modal.querySelector('h2');
    if (titleEl && !titleEl.hasAttribute('tabindex')) titleEl.setAttribute('tabindex', '-1');

    // Anúncio acessível para leitores de tela: atualiza região aria-live
    try {
      let live = document.getElementById('sr-modal-live');
      if (!live) {
        live = document.createElement('div');
        live.id = 'sr-modal-live';
        live.setAttribute('aria-live', 'polite');
        live.setAttribute('role', 'status');
        live.style.position = 'absolute';
        live.style.left = '-9999px';
        live.style.width = '1px';
        live.style.height = '1px';
        live.style.overflow = 'hidden';
        document.body.appendChild(live);
      }
      const title = titleEl?.textContent || 'Diálogo aberto';
      live.textContent = title;
    } catch (_) {}

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal(modal);
        return;
      }
      if (e.key === 'Tab') {
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        if (e.shiftKey) {
          if (document.activeElement === first || modal === document.activeElement) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    function onFocusIn(e) {
      if (!modal.contains(e.target)) {
        (first || modal).focus();
      }
    }

    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocusIn, true);

    state.get(modal).onKey = onKey;
    state.get(modal).onFocusIn = onFocusIn;

    document.body.style.overflow = 'hidden';
    // Focus the first focusable element
    if (first === modal) {
      try { titleEl?.focus(); } catch (_) { modal.focus(); }
    } else {
      (first || modal).focus();
    }
  }

  function closeModal(modal) {
    const entry = state.get(modal);
    if (!entry) return;
    const { onKey, onFocusIn, prev } = entry;
    if (onKey) document.removeEventListener('keydown', onKey, true);
    if (onFocusIn) document.removeEventListener('focusin', onFocusIn, true);

    document.body.style.overflow = '';
    try { prev?.focus(); } catch (_) {}

    modal.setAttribute('aria-hidden', 'true');
    state.delete(modal);
  }

  // Delegation for close buttons (resiliente a replaceWith/clones)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#modal-editar-close, #editar-cancelar-btn, #confirmar-exclusao-btn, #cancelar-exclusao-btn');
    if (!btn) return;
    const id = btn.id;
    if (id === 'modal-editar-close' || id === 'editar-cancelar-btn') {
      if (modalEditar) closeModal(modalEditar);
    } else if (id === 'confirmar-exclusao-btn' || id === 'cancelar-exclusao-btn') {
      if (modalConfirm) closeModal(modalConfirm);
    }
  });

  // Observe attribute/style changes to detect visibility
  const observer = new MutationObserver(() => {
    modals.forEach(modal => {
      if (isVisible(modal)) {
        if (!state.get(modal)) activate(modal);
      } else {
        if (state.get(modal)) closeModal(modal);
      }
    });
  });
  modals.forEach(m => observer.observe(m, { attributes: true, attributeFilter: ['style', 'class', 'aria-hidden'] }));

  // Fallback: initial check
  modals.forEach(m => {
    if (isVisible(m)) activate(m);
    else m.setAttribute && m.setAttribute('aria-hidden', 'true');
  });

  // Expor API mínima para uso manual
  window.__mfModal = window.__mfModal || {};
  window.__mfModal.activate = (el) => { if (el) activate(el); };
  window.__mfModal.close = (el) => { if (el) closeModal(el); };
}
