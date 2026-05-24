import { type ComponentChildren } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import './FloatingWindow.scss';

let topZ = 300;

type Props = {
  title: string;
  width?: number;
  minWidth?: number;
  minHeight?: number;
  children?: ComponentChildren;
};

export function FloatingWindow({ title, width = 300, minWidth = 200, minHeight = 80, children }: Props) {
  const [pos, setPos] = useState({ left: 40, top: 80 });
  const [size, setSize] = useState({ width, height: 'auto' as number | 'auto' });
  const [visible, setVisible] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ ox: number; oy: number } | null>(null);
  const resizeRef = useRef<{ sx: number; sy: number; sw: number; sh: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current) {
        setPos({ left: e.clientX - dragRef.current.ox, top: e.clientY - dragRef.current.oy });
      }
      if (resizeRef.current) {
        const { sx, sy, sw, sh } = resizeRef.current;
        setSize(s => ({ ...s, width: Math.max(minWidth, sw + e.clientX - sx), height: Math.max(minHeight, sh + e.clientY - sy) }));
      }
    };
    const onUp = () => { dragRef.current = null; resizeRef.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [minWidth, minHeight]);

  if (!visible) return null;

  function onTitlebarDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.panel-close')) return;
    const r = panelRef.current!.getBoundingClientRect();
    dragRef.current = { ox: e.clientX - r.left, oy: e.clientY - r.top };
    e.preventDefault();
  }

  function onGripDown(e: MouseEvent) {
    const r = panelRef.current!.getBoundingClientRect();
    resizeRef.current = { sx: e.clientX, sy: e.clientY, sw: r.width, sh: r.height };
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div
      ref={panelRef}
      class="draggable-window"
      style={{ left: pos.left, top: pos.top, width: size.width, ...(size.height !== 'auto' && { height: size.height }) }}
      onMouseDown={() => { if (panelRef.current) panelRef.current.style.zIndex = String(++topZ); }}
    >
      <div class="window-titlebar" onMouseDown={onTitlebarDown}>
        <span class="window-title">{title}</span>
        <button class="panel-close" onClick={() => setVisible(false)}>×</button>
      </div>
      <div class="window-body">{children}</div>
      <div class="window-resize-grip" onMouseDown={onGripDown} />
    </div>
  );
}
