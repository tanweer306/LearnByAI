"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type SelectOnChange = (value: string) => void

interface SelectContextValue {
  value: string
  onValueChange: SelectOnChange
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>
}

const SelectContext = React.createContext<SelectContextValue | undefined>(
  undefined
)

interface SelectProps {
  value?: string
  onValueChange?: SelectOnChange
  children: React.ReactNode
}

const Select = ({ value = "", onValueChange, children }: SelectProps) => {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  const handleValueChange = React.useCallback<SelectOnChange>(
    (nextValue) => {
      onValueChange?.(nextValue)
      setOpen(false)
    },
    [onValueChange]
  )

  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  return (
    <SelectContext.Provider
      value={{ value, onValueChange: handleValueChange, open, setOpen, triggerRef }}
    >
      <div ref={containerRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const mergeRefs = <T,>(...refs: Array<React.Ref<T> | undefined>) => {
  return (node: T) => {
    refs.forEach((ref) => {
      if (!ref) return
      if (typeof ref === "function") {
        ref(node)
      } else {
        ;(ref as React.MutableRefObject<T | null>).current = node
      }
    })
  }
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  if (!context) return null

  const { open, setOpen, triggerRef } = context
  const combinedRef = React.useMemo(() => mergeRefs(ref, triggerRef), [ref])

  return (
    <button
      ref={combinedRef}
      type="button"
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      {...props}
    >
      <span className="flex-1 truncate text-left">{children}</span>
      <ChevronDown
        className={cn("h-4 w-4 opacity-50 transition-transform", open && "rotate-180")}
      />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

interface SelectValueProps {
  placeholder?: string
  children?: React.ReactNode
}

const SelectValue = ({ placeholder, children }: SelectValueProps) => {
  const context = React.useContext(SelectContext)
  if (!context) return null

  const hasValue = Boolean(context.value)
  const content = hasValue ? children ?? context.value : placeholder

  return <span className="truncate text-sm text-foreground">{content}</span>
}

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  if (!context || !context.open) return null

  const { triggerRef } = context
  const [width, setWidth] = React.useState<number | undefined>(undefined)

  React.useLayoutEffect(() => {
    if (triggerRef.current) {
      setWidth(triggerRef.current.getBoundingClientRect().width)
    }
  }, [context.open, triggerRef])

  return (
    <div
      ref={mergeRefs(ref)}
      role="listbox"
      style={{ minWidth: width, width }}
      className={cn(
        "absolute left-0 top-full mt-1 max-h-64 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80",
        className
      )}
      {...props}
    >
      <div className="space-y-1 p-1">{children}</div>
    </div>
  )
})
SelectContent.displayName = "SelectContent"

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) return null

    const isSelected = context.value === value

    return (
      <div
        ref={mergeRefs(ref)}
        role="option"
        aria-selected={isSelected}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          isSelected && "bg-accent text-accent-foreground",
          className
        )}
        onClick={() => context.onValueChange(value)}
        {...props}
      >
        <span className="truncate">{children}</span>
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
