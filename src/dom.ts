type Child = Node | string | null | undefined | false;
type Props = Record<string, unknown>;

// Tiny hyperscript helper: h('button', { class: 'x', onclick: fn }, 'Label')
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2), v as EventListener);
    } else if (k === 'class') {
      el.className = String(v);
    } else {
      el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c);
  }
  return el;
}

export function mount(root: HTMLElement, ...children: Child[]) {
  root.replaceChildren(...children.filter((c): c is Node | string => !!c));
}
