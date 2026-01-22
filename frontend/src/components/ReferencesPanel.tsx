"use client";

import React from "react";
import { Reference } from "./ChatContainer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, ExternalLink, FileText } from "lucide-react";

interface ReferencesPanelProps {
  reference: Reference | null;
  onClose: () => void;
  className?: string;
}

export function ReferencesPanel({
  reference,
  onClose,
  className,
}: ReferencesPanelProps) {
  if (!reference) {
    return null;
  }

  return (
    <div
      className={cn(
        "border-l bg-background h-full flex flex-col",
        "w-full lg:w-[400px]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Referencia Documental</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar panel</span>
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-1">
            Título
          </h4>
          <p className="text-sm">{reference.title}</p>
        </div>

        {/* Source */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-1">
            Fuente
          </h4>
          <p className="text-sm">{reference.source}</p>
        </div>

        {/* Excerpt */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-1">
            Extracto Relevante
          </h4>
          <div className="text-sm bg-muted p-3 rounded-md border">
            <p className="whitespace-pre-wrap">{reference.excerpt}</p>
          </div>
        </div>

        {/* Document Link */}
        {reference.url && (
          <div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              asChild
            >
              <a
                href={reference.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir documento completo
              </a>
            </Button>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t">
          <h4 className="font-medium text-sm text-muted-foreground mb-2">
            Información de Trazabilidad
          </h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-medium">ID:</span> {reference.id}
            </p>
            <p>
              <span className="font-medium">Sistema:</span> RACMC-GPT
            </p>
            <p>
              <span className="font-medium">Tipo:</span> Evidencia documental
            </p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="p-4 border-t bg-muted/50">
        <p className="text-xs text-muted-foreground">
          Esta información se proporciona con fines de consulta regulatoria y
          cumple con los requisitos de trazabilidad de evidencia.
        </p>
      </div>
    </div>
  );
}
