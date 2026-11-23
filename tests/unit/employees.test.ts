import { describe, expect, it } from "vitest";
import { codeFromFileName } from "@/modules/employees/records";

describe("scanned service books", () => {
  it("finds the Employee ID at the start of a file name, for any organisation code", () => {
    expect(codeFromFileName("DEMO00009.pdf")).toBe("DEMO00009");
    expect(codeFromFileName("demo00009 part 2.pdf")).toBe("DEMO00009");
    expect(codeFromFileName("AMBALA00123_SB.pdf")).toBe("AMBALA00123");
    expect(codeFromFileName("service book.pdf")).toBeNull();
  });
});
