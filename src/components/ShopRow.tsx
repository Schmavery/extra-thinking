import type { ComponentProps, ReactNode } from 'react';
import { Button } from './Button';

type ShopButtonProps = ComponentProps<typeof Button>;

/** Shared 3-column shop row: name · action · meta. */
export const SHOP_ROW_GRID =
  'grid grid-cols-[minmax(0,148px)_64px_minmax(0,1fr)] gap-[6px] items-start mb-[7px] min-w-0';

export function ShopRow({ children }: { children: ReactNode }) {
  return <div className={SHOP_ROW_GRID}>{children}</div>;
}

export function ShopName({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="text-fg min-w-0 break-words" title={title}>
      {children}
    </div>
  );
}

export function ShopNameText({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function ShopButton(props: ShopButtonProps) {
  return (
    <Button
      {...props}
      className={['w-full whitespace-nowrap !mr-0 !mb-0', props.className ?? ''].join(' ')}
    />
  );
}

export function ShopMeta({ children }: { children: ReactNode }) {
  return (
    <div className="text-[12px] min-w-0 flex flex-wrap gap-x-[10px] gap-y-[2px] items-baseline">
      {children}
    </div>
  );
}

export function ShopSectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="text-dim text-[11px] tracking-[0.12em] uppercase mb-[10px] mt-6 pb-[5px] border-b border-border">
      {children}
    </div>
  );
}
