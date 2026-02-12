import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted group",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sticky?: "left" | "right"
  left?: number | string
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sticky, left, ...props }, ref) => (
    <th
      ref={ref}
      style={sticky === "left" && left !== undefined ? { left, backgroundColor: 'white' } : sticky === "left" ? { backgroundColor: 'white' } : undefined}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 whitespace-nowrap",
        sticky === "left" &&
        "sticky left-0 z-30 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-slate-50",
        sticky === "right" &&
        "sticky right-0 z-30 bg-white shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.15)]",
        className
      )}
      {...props}
    />
  )
)
TableHead.displayName = "TableHead"

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  sticky?: "left" | "right"
  left?: number | string
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, sticky, left, ...props }, ref) => (
    <td
      ref={ref}
      style={sticky === "left" && left !== undefined ? { left, backgroundColor: 'white' } : sticky === "left" ? { backgroundColor: 'white' } : undefined}
      className={cn(
        "p-4 align-middle [&:has([role=checkbox])]:pr-0",
        sticky === "left" &&
        "sticky left-0 z-20 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-slate-50 group-data-[state=selected]:bg-indigo-50",
        sticky === "right" &&
        "sticky right-0 z-20 bg-white shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.15)] group-hover:bg-slate-50 group-data-[state=selected]:bg-indigo-50",
        className
      )}
      {...props}
    />
  )
)
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
