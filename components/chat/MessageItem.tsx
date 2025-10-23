import ChatMarkdown from "@/components/copilot/ChatMarkdown";
import { FeedbackButtons } from "@/components/copilot/FeedbackButtons";

export function MessageItem({ 
  m,
  datasetId
}: { 
  m: { 
    role: "user" | "assistant"; 
    content: string | React.ReactNode;
    messageId?: string;
  };
  datasetId?: string;
}) {
  const isUser = m.role === "user";
  const showFeedback = !isUser && m.messageId;

  return (
    <div className="w-full">
      <div
        className={`
          ${m.role === "user"
            ? "bg-indigo-50/70 border border-indigo-100 text-zinc-900"
            : "bg-white border border-zinc-200 text-zinc-800"}
          rounded-2xl shadow-sm px-5 py-4 mb-4
        `}
      >
        {typeof m.content === 'string' ? (
          <ChatMarkdown>{m.content}</ChatMarkdown>
        ) : (
          <div className="text-[15px] leading-7">
            {m.content}
          </div>
        )}
        
        {showFeedback && (
          <FeedbackButtons 
            messageId={m.messageId!} 
            datasetId={datasetId}
          />
        )}
      </div>
    </div>
  );
}
