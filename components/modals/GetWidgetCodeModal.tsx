import React from "react";

// TODO: Brand theming integration for widget code generation
// - Load organization brand settings (colors, fonts, logos)
// - Generate widget code with organization-specific theming
// - Support custom CSS injection for white-label widgets
// - Implement theme preview in modal before code generation
// - Add organization-specific widget customization options

export default function GetWidgetCodeModal({
  open,
  onClose,
  datasetId,
  color = "#2563eb",
  theme = "light",
}: {
  open: boolean;
  onClose: () => void;
  datasetId: string;
  color?: string;
  theme?: "light" | "dark";
}) {
  if (!open) return null;

  const host = typeof window !== "undefined" ? window.location.origin : "https://app.yourdomain.com";

  const snippet = `<!-- Avenai Assistant -->
<script src="${host}/widget/avenai-widget.js" async></script>
<script>
  window.AvenaiWidget && window.AvenaiWidget.mount({
    datasetId: "${datasetId}",
    theme: "${theme}",
    color: "${color}",
    position: "bottom-right", // or bottom-left
    mode: "floating"          // or full
  });
</script>`;

  return (
    <div role="dialog" aria-modal="true" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:11000, display:"grid", placeItems:"center" }}>
      <div style={{ width:640, maxWidth:"92vw", background:"#fff", borderRadius:12, padding:20 }}>
        <h3 style={{ marginTop:0 }}>Embed your AI Assistant</h3>
        <p>Paste this snippet on any page where you want the assistant to appear.</p>
        <pre style={{ maxHeight:360, overflow:"auto", background:"#0f172a", color:"#e5e7eb", padding:12, borderRadius:8 }}>
{snippet}
        </pre>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button onClick={() => navigator.clipboard.writeText(snippet)}>Copy</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
