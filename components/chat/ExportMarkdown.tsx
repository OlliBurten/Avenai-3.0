"use client";
import * as React from "react";
import { Download, FileText, Copy, Check } from "lucide-react";

interface ExportMarkdownProps {
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    meta?: {
      confidence?: number;
      confidenceLevel?: 'high' | 'medium' | 'low';
      sources?: Array<{
        title: string;
        chunkIndex: number;
        sourceParagraph: string;
      }>;
    };
  }>;
  datasetName: string;
}

export function ExportMarkdown({ messages, datasetName }: ExportMarkdownProps) {
  const [copied, setCopied] = React.useState(false);

  const generateMarkdown = () => {
    const chatMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');
    
    let markdown = `# ${datasetName} - AI Chat Export\n\n`;
    markdown += `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n\n`;
    markdown += `---\n\n`;

    chatMessages.forEach((message, index) => {
      if (message.role === 'user') {
        markdown += `## Question ${Math.floor(index / 2) + 1}\n\n`;
        markdown += `**User:** ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        markdown += `**AI Assistant:**\n\n`;
        markdown += `${message.content}\n\n`;
        
        // Add confidence and sources if available
        if (message.meta) {
          if (message.meta.confidenceLevel) {
            markdown += `**Confidence:** ${message.meta.confidenceLevel.toUpperCase()}`;
            if (message.meta.confidence) {
              markdown += ` (${Math.round(message.meta.confidence * 100)}%)`;
            }
            markdown += `\n\n`;
          }
          
          if (message.meta.sources && message.meta.sources.length > 0) {
            markdown += `**Sources:**\n\n`;
            message.meta.sources.forEach((source, sourceIndex) => {
              markdown += `${sourceIndex + 1}. **${source.title}** (chunk ${source.chunkIndex})\n`;
              markdown += `   > "${source.sourceParagraph}..."\n\n`;
            });
          }
        }
        
        markdown += `---\n\n`;
      }
    });

    return markdown;
  };

  const handleDownload = () => {
    const markdown = generateMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${datasetName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chat_export.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const markdown = generateMarkdown();
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <FileText className="h-4 w-4 text-gray-600" />
      <span className="text-sm text-gray-700">Export chat as:</span>
      
      <button
        onClick={handleDownload}
        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        <Download className="h-3 w-3" />
        Markdown
      </button>
      
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            Copy
          </>
        )}
      </button>
    </div>
  );
}
