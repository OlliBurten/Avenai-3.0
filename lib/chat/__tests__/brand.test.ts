import { inferBrandFromNames, inferBrandFromDatasets } from "../brand";
import { describe, it, expect } from "vitest";

describe("brand inference", () => {
  it("detects avenai", () => {
    expect(inferBrandFromNames(["Avenai", "Avenai MD"])).toBe("avenai");
  });
  it("detects api-provider", () => {
    expect(inferBrandFromNames(["API Provider"])).toBe("api-provider");
  });
  it("single dataset sets brand", () => {
    expect(inferBrandFromDatasets([{ id:"1", name:"Avenai" }])).toBe("avenai");
  });
  it("mixed brands returns undefined", () => {
    expect(inferBrandFromDatasets([{ id:"1", name:"Avenai" }, { id:"2", name:"Zignsec" }])).toBeUndefined();
  });
});
