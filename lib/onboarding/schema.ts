import { z } from "zod";

export const TEAM_SIZE = ["1", "2_10", "11_50", "51_200", "200_plus"] as const;

export const CompanyPayload = z.object({
  name: z
    .string()
    .transform(v => (typeof v === "string" ? v.trim() : ""))
    .refine(v => v.length > 0, { message: "Company name is required" }),

  website: z
    .string()
    .optional()
    .transform(v => (v && v.trim().length > 0 ? v.trim() : undefined))
    .refine(v => !v || /^https?:\/\/.+/i.test(v), {
      message: "Website must start with http:// or https://",
    }),

  teamSize: z
    .enum(TEAM_SIZE)
    .optional(),
});

export type CompanyPayloadType = z.infer<typeof CompanyPayload>;

// helper that attempts to map labels like "2–10" to codes
export function labelToTeamSizeCode(label?: string) {
  if (!label) return undefined;
  const l = label.toLowerCase();
  if (l.includes("just me") || l === "1") return "1";
  if (l.includes("2") && l.includes("10")) return "2_10";
  if (l.includes("11") && l.includes("50")) return "11_50";
  if (l.includes("51") && l.includes("200")) return "51_200";
  return "200_plus";
}
