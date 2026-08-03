import { describe, expect, it } from "vitest";
import {
  appendTo,
  deleteIn,
  getIn,
  issuesByPath,
  removeAt,
  setIn,
  splitPath,
} from "./form-path";

describe("splitPath", () => {
  it("drops empty segments", () => {
    expect(splitPath("a..b")).toEqual(["a", "b"]);
    expect(splitPath("")).toEqual([]);
  });
});

describe("getIn", () => {
  const source = {
    legalStatus: { companyName: "Acme Ltd" },
    ownership: { shareholders: [{ name: "Ada" }, { name: "Grace" }] },
  };

  it("reads nested object values", () => {
    expect(getIn(source, "legalStatus.companyName")).toBe("Acme Ltd");
  });

  it("reads through array indices", () => {
    expect(getIn(source, "ownership.shareholders.1.name")).toBe("Grace");
  });

  it("returns undefined for a missing branch instead of throwing", () => {
    expect(getIn(source, "powerOfAttorney.grantingCompany")).toBeUndefined();
    expect(getIn(source, "legalStatus.companyName.nope")).toBeUndefined();
  });

  it("returns undefined for a non-numeric index into an array", () => {
    expect(getIn(source, "ownership.shareholders.first")).toBeUndefined();
  });

  it("returns the source itself for an empty path", () => {
    expect(getIn(source, "")).toBe(source);
  });
});

describe("setIn", () => {
  it("creates missing object containers", () => {
    const next = setIn({}, "powerOfAttorney.grantingCompany", "Acme Ltd");
    expect(next).toEqual({ powerOfAttorney: { grantingCompany: "Acme Ltd" } });
  });

  it("creates an array when the next segment is numeric", () => {
    const next = setIn({}, "safetyPerformance.years.0.trir", 1.2);
    expect(next).toEqual({ safetyPerformance: { years: [{ trir: 1.2 }] } });
    expect(
      Array.isArray((next as { safetyPerformance: { years: unknown } }).safetyPerformance.years),
    ).toBe(true);
  });

  it("does not mutate the source", () => {
    const source = { legalStatus: { companyName: "Acme Ltd" } };
    const next = setIn(source, "legalStatus.companyName", "Beta Ltd");
    expect(source.legalStatus.companyName).toBe("Acme Ltd");
    expect(getIn(next, "legalStatus.companyName")).toBe("Beta Ltd");
  });

  it("copies only the containers along the path", () => {
    const source = {
      legalStatus: { companyName: "Acme Ltd" },
      companyContact: { email: "eoi@acme.test" },
    };
    const next = setIn(source, "legalStatus.companyName", "Beta Ltd") as typeof source;
    // Untouched branches keep their identity so React can skip them.
    expect(next.companyContact).toBe(source.companyContact);
    expect(next.legalStatus).not.toBe(source.legalStatus);
  });

  it("replaces the whole value for an empty path", () => {
    expect(setIn({ a: 1 }, "", { b: 2 })).toEqual({ b: 2 });
  });

  it("overwrites a scalar sitting where a container is needed", () => {
    const next = setIn({ water: "lots" }, "water.supplyM3PerDay", 100);
    expect(next).toEqual({ water: { supplyM3PerDay: 100 } });
  });
});

describe("deleteIn", () => {
  it("removes an object key", () => {
    const next = deleteIn({ a: 1, b: 2 }, "b");
    expect(next).toEqual({ a: 1 });
  });

  it("removes an array element and closes the gap", () => {
    const source = { list: ["a", "b", "c"] };
    expect(deleteIn(source, "list.1")).toEqual({ list: ["a", "c"] });
  });

  it("leaves the source alone when the path is missing", () => {
    const source = { a: 1 };
    expect(deleteIn(source, "x.y")).toBe(source);
  });
});

describe("appendTo / removeAt", () => {
  it("appends to a missing array", () => {
    expect(appendTo({}, "comparableProjects", { name: "Plant" })).toEqual({
      comparableProjects: [{ name: "Plant" }],
    });
  });

  it("appends to an existing array without mutating it", () => {
    const source = { list: [1] };
    const next = appendTo(source, "list", 2);
    expect(source.list).toEqual([1]);
    expect(next).toEqual({ list: [1, 2] });
  });

  it("removes by index", () => {
    expect(removeAt({ list: [1, 2, 3] }, "list", 1)).toEqual({ list: [1, 3] });
  });

  it("ignores removeAt on a non-array", () => {
    const source = { list: "nope" };
    expect(removeAt(source, "list", 0)).toBe(source);
  });
});

describe("issuesByPath", () => {
  it("keys messages by dotted path", () => {
    expect(
      issuesByPath([
        { path: "legalStatus.companyName", message: "Required" },
        { path: "ownership.shareholders.0.name", message: "Required" },
      ]),
    ).toEqual({
      "legalStatus.companyName": "Required",
      "ownership.shareholders.0.name": "Required",
    });
  });

  it("keeps only the first issue for a path", () => {
    expect(
      issuesByPath([
        { path: "a", message: "first" },
        { path: "a", message: "second" },
      ]),
    ).toEqual({ a: "first" });
  });
});
