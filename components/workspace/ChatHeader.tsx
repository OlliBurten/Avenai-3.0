"use client";
import { Sparkles, Maximize2, Minimize2, X } from "lucide-react";

type ChatHeaderProps = {
  onExpand?: () => void;
  onExitExpand?: () => void;
  onClose: () => void;
  isExpanded?: boolean;
  showExpandButton?: boolean;
};

export default function ChatHeader({ 
  onExpand, 
  onExitExpand, 
  onClose, 
  isExpanded = false,
  showExpandButton = true 
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-[#F9F5FF] to-[#EEF4FF]">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-gradient-to-br from-[#7F56D9] to-[#9E77ED] rounded-lg flex items-center justify-center p-1.5">
          <img src="/logo-mark-white.svg" alt="Avenai" className="w-full h-full" />
        </div>
        <span className="font-semibold text-gray-900">AI Copilot</span>
      </div>
      <div className="flex items-center gap-1.5">
        {isExpanded ? (
          <button 
            onClick={onExitExpand}
            className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
            aria-label="Exit fullscreen"
          >
            <Minimize2 className="w-4 h-4 text-gray-600" />
          </button>
        ) : showExpandButton ? (
          <button 
            onClick={onExpand}
            className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
            aria-label="Expand"
          >
            <Maximize2 className="w-4 h-4 text-gray-600" />
          </button>
        ) : null}
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-white/60 rounded-lg transition-colors" 
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </header>
  );
}
