/**
 * OpenAPI Document Processor
 * 
 * Handles OpenAPI/Swagger specifications (JSON and YAML)
 */

import SwaggerParser from "@apidevtools/swagger-parser";
import { UDoc } from "../udoc";

export const runtime = 'nodejs';

/**
 * Parse OpenAPI specification and return UDoc
 */
export async function parseOpenAPI(buf: Buffer, filename: string): Promise<UDoc> {
  const raw = buf.toString("utf8");
  
  try {
    const parser = new SwaggerParser();
    const api = await parser.parse(raw);
    const md = renderApiToMd(api as any);
    return {
      md,
      meta: {
        bytes: buf.length, mime: "application/yaml", filename,
        ocrUsed: false, extractor: "openapi", extractedAt: new Date().toISOString(),
        quality: { coveragePct: 1, warnings: [] }
      }
    };
  } catch (error) {
    // Fallback to simple YAML parsing if Swagger Parser fails
    const md = renderSimpleYamlToMd(raw);
    return {
      md,
      meta: {
        bytes: buf.length, mime: "application/yaml", filename,
        ocrUsed: false, extractor: "openapi", extractedAt: new Date().toISOString(),
        quality: { coveragePct: 0.8, warnings: ["Swagger Parser failed, using fallback"] }
      }
    };
  }
}

// very basic renderer (improve over time)
function renderApiToMd(api: any) {
  const lines: string[] = [];
  lines.push(`# ${api.info?.title || "API"}\n`);
  if (api.info?.description) lines.push(api.info.description);
  lines.push("\n---\n");
  const paths = api.paths || {};
  for (const p in paths) {
    const methods = paths[p];
    for (const m in methods) {
      const op = methods[m];
      const summary = op.summary || "";
      lines.push(`## ${m.toUpperCase()} \`${p}\``);
      if (summary) lines.push(summary);
      if (op.parameters?.length) {
        lines.push("\n**Parameters**");
        for (const par of op.parameters) {
          lines.push(`- ${par.name} (${par.in}) ${par.required ? "**required**" : ""}`);
        }
      }
      if (op.requestBody) lines.push("\n**Request Body**\n…");
      lines.push("\n");
    }
  }
  return lines.join("\n");
}

// Simple YAML to Markdown fallback
function renderSimpleYamlToMd(yaml: string) {
  const lines: string[] = [];
  const yamlLines = yaml.split('\n');
  
  let inPaths = false;
  let currentPath = '';
  
  for (const line of yamlLines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('title:')) {
      const title = trimmed.replace('title:', '').trim();
      lines.push(`# ${title}\n`);
    } else if (trimmed.startsWith('description:')) {
      const desc = trimmed.replace('description:', '').trim();
      lines.push(desc);
    } else if (trimmed.startsWith('paths:')) {
      inPaths = true;
      lines.push('\n## API Endpoints\n');
    } else if (inPaths && trimmed.startsWith('/')) {
      currentPath = trimmed.replace(':', '');
      lines.push(`\n### ${currentPath}\n`);
    } else if (inPaths && (trimmed.startsWith('get:') || trimmed.startsWith('post:'))) {
      const method = trimmed.replace(':', '').toUpperCase();
      lines.push(`**${method}** ${currentPath}\n`);
    } else if (trimmed.startsWith('summary:')) {
      const summary = trimmed.replace('summary:', '').trim();
      lines.push(summary);
    }
  }
  
  return lines.join('\n');
}