/**
 * Terminal Carousel Component
 * 
 * Rotates through different terminal scripts automatically
 */
import { useEffect, useState } from "react";
import { HeroTerminal } from "./Terminal";

const SCRIPTS = [
  `$ avenai upload openapi.yaml
Processed: 48 endpoints
Docs generated ✓`,
  `dev › "How do I create a user?"
copilot › Use POST /v1/users with bearer auth
→ code ready for: javascript`,
  `python › requests.post("/v1/users", headers={"Authorization":"Bearer ..."}, json={"name":"Jane"})`,
  `JSON ›
{ "error":"missing bearer token", "hint":"Add Authorization: Bearer <api_key>" }`,
];

export function TerminalCarousel() {
  const [i, setI] = useState(0);
  
  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % SCRIPTS.length), 6000);
    return () => clearInterval(id);
  }, []);
  
  return <HeroTerminal script={SCRIPTS[i]} />;
}
