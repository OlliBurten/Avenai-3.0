export type TemplateOptions = {
  baseUrl?: string;   // e.g., "https://api.example.com/v1"
  endpoint?: string;  // e.g., "/v1/sessions"
};

export type CodeLang = "py" | "js" | "ts";

export type CodeTemplateFn = (opts?: TemplateOptions) => string;

export type IntentKind =
  | "AUTH"
  | "LIST_ENDPOINTS"
  | "CODE_EXAMPLE"
  | "ERROR_CODE"
  | "DOCS_LIST"
  | "GENERAL";

export type ThreadHints = {
  preferDocId?: string;
  preferDocTitle?: string;
  brandLock?: "avenai" | "zignsec";
  brandTtl?: number;
  lastEndpointMention?: string; // e.g. "/v1/auth"
};
