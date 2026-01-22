"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Filter, X } from "lucide-react";

export interface FilterOptions {
  project?: string;
  documentType?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

interface FilterSidebarProps {
  onFilterChange: (filters: FilterOptions) => void;
  projects?: string[];
  documentTypes?: string[];
  className?: string;
}

export function FilterSidebar({
  onFilterChange,
  projects = [],
  documentTypes = [],
  className,
}: FilterSidebarProps) {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [isOpen, setIsOpen] = useState(false);

  const handleProjectChange = (project: string) => {
    const newFilters = { ...filters, project: project || undefined };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDocumentTypeChange = (type: string) => {
    const newFilters = { ...filters, documentType: type || undefined };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const hasActiveFilters = filters.project || filters.documentType;

  return (
    <div className={cn("border-r bg-background h-full", className)}>
      {/* Mobile Toggle */}
      <div className="lg:hidden p-4 border-b">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros {hasActiveFilters && `(${Object.keys(filters).length})`}
        </Button>
      </div>

      {/* Filter Content */}
      <div
        className={cn(
          "p-4 space-y-4",
          "lg:block",
          isOpen ? "block" : "hidden lg:block"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h3 className="font-semibold text-sm">Filtros</h3>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-7 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        <Separator />

        {/* Project Filter */}
        <div className="space-y-2">
          <Label htmlFor="project-filter" className="text-sm">
            Proyecto
          </Label>
          <select
            id="project-filter"
            value={filters.project || ""}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Todos los proyectos</option>
            {projects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
        </div>

        {/* Document Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="doctype-filter" className="text-sm">
            Tipo de Documento
          </Label>
          <select
            id="doctype-filter"
            value={filters.documentType || ""}
            onChange={(e) => handleDocumentTypeChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Todos los tipos</option>
            {documentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">
                Filtros activos:
              </h4>
              <div className="space-y-1">
                {filters.project && (
                  <div className="text-xs p-2 bg-primary/10 rounded-md flex items-center justify-between">
                    <span>Proyecto: {filters.project}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={() => handleProjectChange("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {filters.documentType && (
                  <div className="text-xs p-2 bg-primary/10 rounded-md flex items-center justify-between">
                    <span>Tipo: {filters.documentType}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={() => handleDocumentTypeChange("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Info */}
        <div className="pt-4">
          <p className="text-xs text-muted-foreground">
            Los filtros se aplican a las búsquedas de documentos y referencias.
          </p>
        </div>
      </div>
    </div>
  );
}
