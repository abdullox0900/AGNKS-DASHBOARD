import type { ComponentProps, ReactNode } from 'react'
import { DropdownMenu, Popover, Tooltip } from 'radix-ui'
import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

/** Radix UI primitives (focus management, keyboard nav, collision-aware placement) dressed in the dashboard palette. */

const panelClass =
  'z-40 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-1.5 text-[13px] text-[var(--color-ink)] outline-none animate-[menu-in_140ms_ease-out]'
const itemClass =
  'flex w-full cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-left outline-none data-[highlighted]:bg-[var(--color-surface-alt)] data-[disabled]:pointer-events-none data-[disabled]:opacity-40'

export const Menu = DropdownMenu.Root
export const MenuTrigger = DropdownMenu.Trigger

export function MenuContent({ className, ...props }: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={6}
        align="start"
        collisionPadding={12}
        className={cn(panelClass, 'min-w-[12rem]', className)}
        style={{ boxShadow: 'var(--shadow-popover)' }}
        {...props}
      />
    </DropdownMenu.Portal>
  )
}

export function MenuItem({ className, danger, ...props }: ComponentProps<typeof DropdownMenu.Item> & { danger?: boolean }) {
  return (
    <DropdownMenu.Item
      className={cn(itemClass, danger && 'text-[var(--color-danger)] data-[highlighted]:bg-[var(--color-danger-soft)]', className)}
      {...props}
    />
  )
}

/** Multi-select row — stays open after a click so several options can be ticked in one go. */
export function MenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof DropdownMenu.CheckboxItem>) {
  return (
    <DropdownMenu.CheckboxItem
      onSelect={(e) => e.preventDefault()}
      className={cn(itemClass, 'group', className)}
      {...props}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[var(--color-border-strong)] group-data-[state=checked]:border-[var(--color-primary)] group-data-[state=checked]:bg-[var(--color-primary)]">
        <DropdownMenu.ItemIndicator>
          <Check size={12} strokeWidth={3} className="text-[var(--color-primary-ink)]" />
        </DropdownMenu.ItemIndicator>
      </span>
      {children}
    </DropdownMenu.CheckboxItem>
  )
}

export const MenuRadioGroup = DropdownMenu.RadioGroup

export function MenuRadioItem({ className, children, ...props }: ComponentProps<typeof DropdownMenu.RadioItem>) {
  return (
    <DropdownMenu.RadioItem className={cn(itemClass, 'justify-between', className)} {...props}>
      <span className="flex items-center gap-2">{children}</span>
      <DropdownMenu.ItemIndicator>
        <Check size={14} className="text-[var(--color-primary)]" />
      </DropdownMenu.ItemIndicator>
    </DropdownMenu.RadioItem>
  )
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
}

export const PopoverRoot = Popover.Root
export const PopoverTrigger = Popover.Trigger
export const PopoverClose = Popover.Close

export function PopoverContent({ className, ...props }: ComponentProps<typeof Popover.Content>) {
  return (
    <Popover.Portal>
      <Popover.Content
        sideOffset={6}
        align="start"
        collisionPadding={12}
        className={cn(panelClass, className)}
        style={{ boxShadow: 'var(--shadow-popover)' }}
        {...props}
      />
    </Popover.Portal>
  )
}

export const TooltipProvider = Tooltip.Provider

/** Hover/focus tooltip; renders the child untouched when there is no label. */
export function Hint({ label, side, children }: { label?: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left'; children: ReactNode }) {
  if (!label) return <>{children}</>
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          className="z-50 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-alt)] px-2.5 py-1.5 font-mono text-[12px] text-[var(--color-ink)]"
          style={{ boxShadow: 'var(--shadow-popover)' }}
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
