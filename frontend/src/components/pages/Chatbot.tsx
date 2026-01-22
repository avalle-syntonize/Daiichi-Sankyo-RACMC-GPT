"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Send, Upload, Download, X } from "lucide-react";

// Type definitions matching the mockup
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

interface Citation {
  id: string;
  document: string;
  metadata: string;
}

interface FilterCategory {
  title: string;
  filters: Filter[];
}

interface Filter {
  id: string;
  label: string;
  value: string;
}

export default function ChatbotPage() {
  const session = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter categories matching the mockup
  const filterCategories: FilterCategory[] = [
    {
      title: "Dossiers",
      filters: [
        { id: "ds-1062", label: "DS-1062", value: "DS-1062" },
        { id: "u3-1402", label: "U3-1402", value: "U3-1402" },
        { id: "ds-8201", label: "DS-8201", value: "DS-8201" },
        { id: "impd", label: "IMPD", value: "impd" },
        { id: "maa", label: "MAA", value: "maa" },
        { id: "bla", label: "BLA", value: "bla" },
        { id: "core", label: "Core", value: "core" },
      ],
    },
    {
      title: "Guidelines",
      filters: [
        { id: "ema", label: "EMA", value: "ema" },
        { id: "ich", label: "ICH", value: "ich" },
        { id: "fda", label: "FDA", value: "fda" },
        { id: "jp", label: "JP", value: "jp" },
        { id: "cn", label: "CN", value: "cn" },
        { id: "row", label: "RoW", value: "row" },
      ],
    },
    {
      title: "Internal Guidance",
      filters: [
        { id: "internal", label: "Internal Documents", value: "internal-guidance" },
      ],
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFilterToggle = (value: string) => {
    const newFilters = new Set(selectedFilters);
    if (newFilters.has(value)) {
      newFilters.delete(value);
    } else {
      newFilters.add(value);
    }
    setSelectedFilters(newFilters);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || selectedFilters.size === 0) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setUploadedFiles([]);
    setIsLoading(true);

    // Simulate AI response with citations (matching mockup)
    setTimeout(() => {
      const selectedFiltersList = Array.from(selectedFilters);
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `Based on selected sources (${selectedFiltersList.join(", ")}), here are the findings:

<strong>1. Process Validation Protocol</strong>
This must include a detailed description of the manufacturing process, critical process parameters, and acceptance criteria.

<strong>2. Manufacturing Batch Records</strong>
Complete batch manufacturing records for at least three consecutive batches must be provided to demonstrate process consistency and control.

<strong>3. Quality Control Testing Results</strong>
All in-process and final product testing results must be documented and compared against established specifications.

All documentation must follow the format specified in Annex 15 of the EU GMP guidelines.`,
        citations: [
          {
            id: "c1",
            document: "IMPD_Guidelines_v2.3.pdf",
            metadata: "Page 47 | Uploaded: 2024-01-15",
          },
          {
            id: "c2",
            document: "Manufacturing_SOP_2024.docx",
            metadata: "Page 12 | Uploaded: 2023-11-20",
          },
          {
            id: "c3",
            document: "QC_Procedures.xlsx",
            metadata: "Sheet: Validation | Uploaded: 2024-02-03",
          },
        ],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleExport = () => {
    // Create export content
    const exportContent = messages
      .map((msg) => {
        const role = msg.role === "user" ? "User" : "AI Assistant";
        let content = `${role}: ${msg.content}`;
        if (msg.citations && msg.citations.length > 0) {
          content += "\n\nCitations:\n";
          msg.citations.forEach((c) => {
            content += `- ${c.document} (${c.metadata})\n`;
          });
        }
        return content;
      })
      .join("\n\n---\n\n");

    const blob = new Blob([exportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RA_CMC_GPT_Export_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const userName = session.data?.user?.name || "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const canSend = selectedFilters.size > 0 && inputValue.trim().length > 0;

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f5]">
      {/* Header with Daiichi Sankyo gradient */}
      <header className="bg-gradient-to-r from-[#005BAA] via-[#00ACEA] via-[#89BA17] to-[#CFD300] text-white px-10 py-5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-5">
          <div className="bg-white text-[#005BAA] font-bold text-lg px-4 py-2 rounded">
            DS
          </div>
          <h1 className="text-2xl font-medium">RA CMC-GPT</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm">{userName}</div>
            <button
              onClick={() => signOut()}
              className="text-xs opacity-90 hover:opacity-100 transition-opacity underline"
            >
              Logout
            </button>
          </div>
          <div className="w-9 h-9 rounded-full bg-white text-[#005BAA] font-bold flex items-center justify-center">
            {userInitials}
          </div>
        </div>
      </header>

      {/* Main content wrapper */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with filters */}
        <aside className="w-[280px] bg-white border-r border-gray-200 flex flex-col shadow-sm">
          <div className="px-4 pt-6 pb-4 border-b-2 border-gray-200">
            <h2 className="text-base font-semibold text-gray-800 mb-1">
              Filter by Source
            </h2>
            <p className="text-xs text-gray-500">Select one or more</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {filterCategories.map((category) => (
              <div key={category.title}>
                <h3 className="text-xs font-bold text-[#005BAA] uppercase px-3 py-3 mt-3 first:mt-0">
                  {category.title}
                </h3>
                {category.filters.map((filter) => (
                  <label
                    key={filter.id}
                    className="flex items-center gap-2.5 px-3 py-3 mb-2 rounded-md cursor-pointer hover:bg-gray-50 transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFilters.has(filter.value)}
                      onChange={() => handleFilterToggle(filter.value)}
                      className="w-[18px] h-[18px] cursor-pointer accent-[#00B4ED]"
                    />
                    <span className="text-sm text-gray-800 group-hover:text-[#00B4ED] group-hover:font-medium transition-all">
                      {filter.label}
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setShowExportModal(true)}
              className="w-full bg-white border-2 border-[#00B4ED] text-[#00B4ED] py-3 px-4 rounded-md text-sm font-medium hover:bg-[#00B4ED] hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export History
            </button>
          </div>
        </aside>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col p-10">
          {/* Info box */}
          <div className="bg-[#e3f5ff] border-l-4 border-[#00B4ED] p-4 rounded-md mb-5 max-h-20">
            <p className="text-[#005BAA] text-sm leading-relaxed">
              <strong>ℹ️ Important: </strong> This system is designed for
              Regulatory Affairs - Chemistry, Manufacturing and Controls (RA CMC)
              use only. All responses are based on internal documentation and
              should be verified before regulatory submission.
            </p>
          </div>

          {/* Chat area */}
          <div className="bg-white rounded-lg shadow-sm flex flex-col flex-1 ">
            {/* Messages container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="mb-3 opacity-50"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <p className="text-lg text-gray-800 mb-2">
                    Welcome to RA CMC-GPT
                  </p>
                  <p className="text-sm">
                    Select filters and start asking questions about your
                    regulatory documentation.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3 max-w-[85%] animate-[slideIn_0.3s_ease-out]",
                        message.role === "user"
                          ? "ml-auto flex-row-reverse"
                          : ""
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {message.role === "user" ? userInitials : "AI"}
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg shadow-sm flex-1">
                        <div
                          className="text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: message.content.replace(/\n/g, "<br/>"),
                          }}
                        />
                        {message.citations && message.citations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                            {message.citations.map((citation) => (
                              <a
                                key={citation.id}
                                href="#"
                                className="block p-2 rounded bg-white border border-gray-200 hover:border-[#00B4ED] hover:bg-blue-50 transition-colors"
                                title="Click to view document"
                              >
                                <div className="text-xs font-medium text-[#005BAA]">
                                  {citation.document}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {citation.metadata}
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        AI
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-gray-200 p-4">
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded text-sm"
                    >
                      📄 {file.name}
                      <button
                        onClick={() => removeFile(index)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about your regulatory documentation..."
                  className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4ED] focus:border-transparent"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xlsx,.txt,.pptx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Upload document"
                >
                  <Upload className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!canSend}
                  className="p-3 bg-gradient-to-br from-[#005BAA] to-[#00ACEA] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-[600px] max-w-[90%] animate-[modalSlideIn_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-[#005BAA] to-[#00ACEA] text-white p-6 rounded-t-xl">
              <h2 className="text-xl font-semibold mb-2">
                Export Conversation History
              </h2>
              <p className="text-sm opacity-90">Download as Plain Text</p>
            </div>
            <div className="p-6">
              <p className="text-gray-600 leading-relaxed mb-4">
                Your conversation will be downloaded as a Plain Text file (.txt),
                suitable for documentation and archiving. This file includes your
                conversation with all citations.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded text-sm text-yellow-800">
                <strong className="block mb-1">🔒 Privacy Notice:</strong>
                Conversation histories are not stored on our servers. This export
                is a one-time download of your current session only. Once you
                close this session, the conversation will not be retrievable.
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="px-6 py-3 bg-gradient-to-br from-[#005BAA] to-[#00ACEA] text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

