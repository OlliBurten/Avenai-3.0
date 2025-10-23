'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeExternalLinks from 'rehype-external-links';

type MarkdownProps = {
  children: string;
  className?: string;
};

function transformCitations(text: string) {
  // turn [md:#1] / [pdf:#3] / [#4] into colored badges
  return text.replace(/\[(md:|pdf:)?#(\d+)\]/g, (_m, kind, n) => {
    if (kind === "md:") return `<span class="badge badge--md">md #${n}</span>`
    if (kind === "pdf:") return `<span class="badge badge--pdf">pdf #${n}</span>`
    return `<span class="badge">#${n}</span>`
  })
}

export default function Markdown({ children, className }: MarkdownProps) {
  const withBadges = React.useMemo(() => transformCitations(children), [children])
  
  // Simple markdown to HTML conversion
  const renderMarkdown = (text: string) => {
    let html = text;
    
    // Process code blocks first (to avoid conflicts with inline code)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="bg-gray-50 text-gray-800 p-4 rounded-md overflow-x-auto text-sm font-mono relative border border-gray-200 my-4"><button class="absolute top-2 right-2 bg-white hover:bg-gray-50 text-gray-500 text-xs px-2 py-1 rounded border border-gray-200 transition-colors shadow-sm" onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent)">Copy</button><code class="text-gray-800">${code.trim()}</code></pre>`;
    });
    
    // Process numbered lists with bold headers and sub-items
    const lines = html.split('\n');
    let processedLines = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // Check if this is a numbered list item with bold header
      const numberedMatch = line.match(/^(\d+)\. \*\*(.*?)\*\*\s*$/);
      
      if (numberedMatch) {
        const num = numberedMatch[1];
        const title = numberedMatch[2].trim();
        
        // Look ahead for sub-items (both bullet points and indented lines)
        let subItems = [];
        let j = i + 1;
        
        while (j < lines.length && (lines[j].match(/^\s+- /) || lines[j].match(/^\s+\*\*.*?\*\*.*$/) || (lines[j].trim() && !lines[j].match(/^\d+\. /)))) {
          if (lines[j].trim()) {
            subItems.push(lines[j].trim());
          }
          j++;
        }
        
        if (subItems.length > 0) {
          const subItemsHtml = subItems
            .map(subItem => {
              // Remove leading "- " if it exists
              const content = subItem.replace(/^-\s*/, '');
              return `<li class="mb-2 text-sm">${content}</li>`;
            })
            .join('');
          
          processedLines.push(`
            <div class="mb-6">
              <h4 class="text-base font-semibold text-gray-700 mb-3">${num}. ${title}</h4>
              <ul class="list-disc pl-6 space-y-1">${subItemsHtml}</ul>
            </div>
          `);
          
          i = j; // Skip the processed lines
        } else {
          processedLines.push(`<h4 class="text-base font-semibold text-gray-700 mb-3">${num}. ${title}</h4>`);
          i++;
        }
      } else {
        processedLines.push(line);
        i++;
      }
    }
    
    html = processedLines.join('\n');
    
    // Headers - process line by line
    html = html.split('\n').map(headerLine => {
      if (headerLine.match(/^### /)) {
        return headerLine.replace(/^### (.*)$/, '<h3 class="text-lg font-medium text-gray-700 mb-2">$1</h3>');
      } else if (headerLine.match(/^## /)) {
        return headerLine.replace(/^## (.*)$/, '<h2 class="text-xl font-semibold text-gray-800 mb-3">$1</h2>');
      } else if (headerLine.match(/^# /)) {
        return headerLine.replace(/^# (.*)$/, '<h1 class="text-2xl font-bold text-gray-900 mb-4">$1</h1>');
      }
      return headerLine;
    }).join('\n');
    
    // Bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded font-mono text-sm">$1</code>');
    
    // Regular bullet points (standalone)
    html = html.replace(/^- (.*$)/gim, '<li class="mb-1">$1</li>');
    html = html.replace(/(<li class="mb-1">.*<\/li>)/gs, '<ul class="list-disc pl-6 space-y-1 mb-3">$1</ul>');
    
    // Paragraphs - split by double newlines and wrap content
    const paragraphs = html.split(/\n\s*\n/);
    html = paragraphs.map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<')) return p; // Already has HTML tags
      return `<p class="leading-7 mb-4">${p}</p>`;
    }).join('');
    
    return html;
  };

  const renderedHtml = renderMarkdown(withBadges);

  return (
    <div className={className}>
      <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
    </div>
  );
}
