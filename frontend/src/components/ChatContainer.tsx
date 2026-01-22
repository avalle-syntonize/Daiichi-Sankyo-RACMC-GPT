"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  references?: Reference[];
}

export interface Reference {
  id: string;
  title: string;
  source: string;
  excerpt: string;
  url?: string;
}

interface ChatContainerProps {
  messages: Message[];
  onReferenceClick?: (reference: Reference) => void;
  className?: string;
}

export function ChatContainer({
  messages,
  onReferenceClick,
  className,
}: ChatContainerProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">No hay mensajes todavía</p>
              <p className="text-sm mt-2">
                Comienza una conversación haciendo una pregunta
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex w-full",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-4 shadow-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <div className="text-sm font-medium mb-1">
                  {message.role === "user" ? "Tú" : "RACMC-GPT"}
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                </div>
                {message.references && message.references.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="text-xs font-medium mb-2">
                      Referencias ({message.references.length}):
                    </div>
                    <div className="space-y-2">
                      {message.references.map((ref) => (
                        <button
                          key={ref.id}
                          onClick={() => onReferenceClick?.(ref)}
                          className="block w-full text-left text-xs p-2 rounded hover:bg-background/50 transition-colors"
                        >
                          <div className="font-medium truncate">
                            {ref.title}
                          </div>
                          <div className="text-muted-foreground truncate">
                            {ref.source}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-2">
                  {message.timestamp.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
