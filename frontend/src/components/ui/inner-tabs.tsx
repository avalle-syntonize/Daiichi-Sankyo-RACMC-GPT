"use client"

import * as React from "react"
import * as InnerTabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const InnerTabs = InnerTabsPrimitive.Root

const InnerTabsList = React.forwardRef<
  React.ElementRef<typeof InnerTabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof InnerTabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <InnerTabsPrimitive.List
    ref={ref}
    className={cn(
      "flex w-full items-center justify-start bg-transparent p-0 gap-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
InnerTabsList.displayName = InnerTabsPrimitive.List.displayName

const InnerTabsTrigger = React.forwardRef<
  React.ElementRef<typeof InnerTabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof InnerTabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <InnerTabsPrimitive.Trigger
    ref={ref}
    className={cn(
      " h-10 px-4 inline-flex items-center justify-center bg-primary gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 data-[state=active]:text-foreground text-foreground/60 data-[state=active]:bg-white",
      className
    )}
    {...props}
  />
))
InnerTabsTrigger.displayName = InnerTabsPrimitive.Trigger.displayName

const InnerTabsContent = React.forwardRef<
  React.ElementRef<typeof InnerTabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof InnerTabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <InnerTabsPrimitive.Content
    ref={ref}
    className={cn(
      "h-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
InnerTabsContent.displayName = InnerTabsPrimitive.Content.displayName

export { InnerTabs, InnerTabsList, InnerTabsTrigger, InnerTabsContent }
