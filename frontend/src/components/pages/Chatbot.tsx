"use client";

import React, { useState } from "react";
import { ChatContainer, Message, Reference } from "@/components/ChatContainer";
import { ChatInput } from "@/components/ChatInput";
import { ReferencesPanel } from "@/components/ReferencesPanel";
import { FilterSidebar, FilterOptions } from "@/components/FilterSidebar";
import { useSession } from "next-auth/react";

export default function ChatbotPage() {
  const session = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(
    null
  );
  const [filters, setFilters] = useState<FilterOptions>({});

  // Mock data for filters - in production, these would come from the API
  const projects = ["Proyecto A", "Proyecto B", "Proyecto C"];
  const documentTypes = [
    "Regulatorio",
    "Clínico",
    "Farmacológico",
    "Calidad",
  ];

  const handleSendMessage = async (content: string) => {
    // Create user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // TODO: Replace with actual API call to backend
      // For now, simulate a response
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockReferences: Reference[] = [
        {
          id: "ref-001",
          title: "Guía de Buenas Prácticas Clínicas",
          source: "ICH E6(R2)",
          excerpt:
            "Las buenas prácticas clínicas son un estándar internacional de calidad ética y científica para el diseño, conducción, registro e informe de ensayos...",
          url: "#",
        },
      ];

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `Basándome en la documentación disponible${
          filters.project ? ` del ${filters.project}` : ""
        }${
          filters.documentType ? ` (${filters.documentType})` : ""
        }, puedo proporcionarte la siguiente información:\n\n${content.includes("?") ? "Esta es una respuesta simulada a tu pregunta." : "Aquí está la información que solicitaste."}\n\nLa respuesta se basa en los documentos regulatorios más recientes y cumple con los estándares de trazabilidad requeridos.`,
        timestamp: new Date(),
        references: mockReferences,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      // Handle error - could show a toast notification
    } finally {
      setIsLoading(false);
    }
  };

  const handleReferenceClick = (reference: Reference) => {
    setSelectedReference(reference);
  };

  const handleCloseReference = () => {
    setSelectedReference(null);
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    // In production, you might want to refetch messages or update the query context
  };

  return (
    <div className="relative h-full flex bg-white">
      {/* Filter Sidebar */}
      <div className="hidden lg:block lg:w-[280px] flex-shrink-0">
        <FilterSidebar
          onFilterChange={handleFilterChange}
          projects={projects}
          documentTypes={documentTypes}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 border-b bg-background">
          <h1 className="text-xl font-semibold">RACMC-GPT</h1>
          <p className="text-sm text-muted-foreground">
            Asistente de consulta regulatoria
          </p>
        </div>

        {/* Chat Container */}
        <div className="flex-1 min-h-0">
          <ChatContainer
            messages={messages}
            onReferenceClick={handleReferenceClick}
          />
        </div>

        {/* Chat Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholder="Haz una pregunta sobre documentación regulatoria..."
        />
      </div>

      {/* References Panel */}
      {selectedReference && (
        <div className="hidden lg:block flex-shrink-0">
          <ReferencesPanel
            reference={selectedReference}
            onClose={handleCloseReference}
          />
        </div>
      )}

      {/* Mobile References Panel - Full Screen Overlay */}
      {selectedReference && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background">
          <ReferencesPanel
            reference={selectedReference}
            onClose={handleCloseReference}
          />
        </div>
      )}

      {/* Mobile Filter Sidebar - Show filter button */}
      <div className="lg:hidden fixed bottom-20 right-4 z-40">
        <FilterSidebar
          onFilterChange={handleFilterChange}
          projects={projects}
          documentTypes={documentTypes}
          className="fixed inset-x-0 bottom-0 top-20 bg-background border-t shadow-lg"
        />
      </div>
    </div>
  );
}

