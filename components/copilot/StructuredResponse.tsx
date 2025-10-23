"use client";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type StructuredAnswer = {
  document: string;
  content: string;
  [key: string]: any; // Allow unknown keys for forward compatibility
};

type Evidence = {
  doc: string;
  page?: number;
  snippet?: string;
};

type StructuredResponse = {
  answers: StructuredAnswer[];
  summary?: string;
  schemaVersion?: string;
  metadata?: any;
  coverage?: "full" | "partial" | "out_of_scope";
  evidence?: Evidence[];
  [key: string]: any; // Allow unknown keys for forward compatibility
};

export default function StructuredResponse({ response }: { response: StructuredResponse }) {
  // Safely access properties with fallbacks
  const answers = response?.answers || [];
  const summary = response?.summary;

  // Post-processor to remove redundant sentences
  const processAnswerContent = (content: string, documentTitle: string) => {
    if (!summary) return content;
    
    let processedContent = content;
    
    // Remove redundant "last updated" sentences if summary already mentions it
    if (summary.toLowerCase().includes('last updated')) {
      // Pattern: "It was last updated in Month YYYY." anywhere in the content
      processedContent = processedContent.replace(/\s*It was last updated (in|on) \w+\s+\d{4}\.\s*/gi, ' ');
      // Pattern: "The document was last updated..." anywhere in the content
      processedContent = processedContent.replace(/\s*The [^.]*document was last updated (in|on) \w+\s+\d{4}\.\s*/gi, ' ');
    }
    
    // Remove redundant opening sentences
    const redundantPatterns = [
      // Pattern: "The [Product] is designed for..." when summary already says this
      /^The [^.]* is designed for [^.]*\.\s*/i,
      // Pattern: "This [Product] enables..." when summary already covers this
      /^This [^.]* enables [^.]*\.\s*/i,
      // Pattern: "The [Product] provides..." when summary already covers this
      /^The [^.]* provides [^.]*\.\s*/i,
      // Pattern: "The [Document] document provides..." when summary already covers this
      /^The [^\n]* document provides [^.]*\.\s*/i,
      // Pattern: "The '[Document]' document provides..." when summary already covers this
      /^The '[^\n]*' document provides [^.]*\.\s*/i,
    ];
    
    // Check if first sentence is redundant with summary
    for (const pattern of redundantPatterns) {
      const match = processedContent.match(pattern);
      if (match) {
        const firstSentence = match[0];
        // Check if this sentence is essentially saying the same thing as the summary
        const summaryWords = summary.toLowerCase().split(/\s+/);
        const firstSentenceWords = firstSentence.toLowerCase().split(/\s+/);
        
        // If more than 60% of words overlap, remove the redundant sentence
        const overlap = firstSentenceWords.filter(word => 
          word.length > 3 && summaryWords.includes(word)
        ).length;
        
        if (overlap / firstSentenceWords.length > 0.6) {
          processedContent = processedContent.replace(pattern, '').trim();
          console.log('🔧 Removed redundant opening sentence:', firstSentence.substring(0, 50) + '...');
        }
      }
    }
    
    // Clean up any double spaces
    processedContent = processedContent.replace(/\s{2,}/g, ' ').trim();
    
    return processedContent;
  };
  
  // Check if this is a cross-document answer
  const isCrossDocAnswer = answers.length > 1 || 
    answers[0]?.document === "Cross-Document Summary" ||
    answers[0]?.document === "Combined Analysis";
  
  // Check if this is a unified answer (no document sections needed)
  const isUnifiedAnswer = answers.length === 1 && 
    (answers[0]?.document === "Cross-Document Summary" ||
     answers[0]?.document === "Combined Analysis" || 
     answers[0]?.document === "Developer Audience" ||
     answers[0]?.document === "General" ||
     answers[0]?.document?.includes("Analysis") ||
     answers[0]?.document?.includes("Audience"));


  return (
    <div className="max-w-none leading-relaxed text-gray-900 prose prose-zinc">
      {/* Cross-Doc Insight Label */}
      {isCrossDocAnswer && (
        <div className="mb-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Cross-Document Insight
        </div>
      )}
      
      {/* Summary Section - Always first if present */}
      {summary && (
        <div className="mb-6">
          <p className="text-gray-900 leading-7 font-medium m-0">
            {summary}
          </p>
        </div>
      )}

      {/* Document Sections */}
      {answers.map((answer, index) => (
        <div key={index} className="mb-6">
          {!isUnifiedAnswer && (
            <h4 className="text-[15px] font-semibold mb-3 mt-6 first:mt-0 text-gray-900 !font-semibold">
              From Document: {answer.document}
            </h4>
          )}
          <div className="text-gray-900 leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Paragraphs - comfortable spacing, normal weight
                p: ({ children }) => <p className="my-3 first:mt-0 last:mb-0 leading-relaxed text-gray-900" style={{ fontWeight: 'normal' }}>{children}</p>,
                
                // Lists - tight and readable
                ul: (props) => <ul className="my-3 list-disc pl-6 space-y-1.5 text-gray-900" style={{ fontWeight: 'normal' }} {...props} />,
                ol: (props) => <ol className="my-3 list-decimal pl-6 space-y-1.5 text-gray-900" style={{ fontWeight: 'normal' }} {...props} />,
                li: ({ children }) => <li className="my-1.5 leading-relaxed text-gray-900" style={{ fontWeight: 'normal' }}>{children}</li>,
                
                // Blockquotes - clean style
                blockquote: (props) => (
                  <blockquote className="border-l-4 border-zinc-300 pl-4 my-4 text-zinc-600 italic" {...props} />
                ),
                
                // Headings - proper hierarchy with explicit colors and weights
                h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-6 first:mt-0 text-gray-900 !font-bold">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-6 first:mt-0 text-gray-900 !font-semibold">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-6 first:mt-0 text-gray-900 !font-semibold">{children}</h3>,
                h4: ({ children }) => <h4 className="text-[15px] font-semibold mb-2 mt-6 first:mt-0 text-gray-900 !font-semibold">{children}</h4>,
                
                // Code - no nested boxes, clean overflow
                code: (props: any) => {
                  const {inline, ...rest} = props;
                  return inline ? (
                    <code className="px-1.5 py-0.5 rounded-md bg-zinc-100 text-[13px] font-mono text-zinc-800" {...rest} />
                  ) : (
                    <code className="block bg-zinc-100 text-zinc-800 p-4 rounded-lg text-[13px] overflow-x-auto my-4 font-mono leading-relaxed border border-zinc-200" {...rest} />
                  );
                },
                
                // Pre - single container for code blocks
                pre: ({ children }) => (
                  <div className="my-4 overflow-hidden rounded-lg">
                    <pre className="overflow-x-auto p-0 m-0 bg-transparent border-0">{children}</pre>
                  </div>
                ),
                
                // Tables - responsive
                table: (props) => (
                  <div className="my-4 overflow-x-auto">
                    <table className="min-w-full border-collapse" {...props} />
                  </div>
                ),
                
                // Dividers - remove horizontal rules to avoid ugly lines
                hr: () => null,
                
                // Links
                a: (props) => (
                  <a className="text-brand-600 dark:text-brand-400 hover:underline" {...props} />
                ),
              }}
            >
              {processAnswerContent(answer.content, answer.document)}
            </ReactMarkdown>
          </div>
        </div>
      ))}

    </div>
  );
}
