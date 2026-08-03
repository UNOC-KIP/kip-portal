/**
 * Dotted-path read/write over the EOI section payloads.
 *
 * The payloads are deeply nested and partly array-shaped
 * (`ownership.shareholders.0.name`), and they are saved as raw JSON, so the
 * wizard addresses fields by the same dotted path Zod reports in
 * `issue.path.join(".")`. That is the whole point: an error path from the
 * schema maps onto an input with no translation layer in between.
 *
 * Pure — no React, no `@kip/db`. Unit-tested in form-path.test.ts.
 */

export type PathValue = unknown;

/** A numeric segment addresses an array index; anything else is an object key. */
function isIndex(segment: string): boolean {
  return /^\d+$/.test(segment);
}

export function splitPath(path: string): string[] {
  return path.split(".").filter((s) => s.length > 0);
}

/** Reads `path` from `source`, or undefined if any step is missing. */
export function getIn(source: unknown, path: string): PathValue {
  let current: unknown = source;
  for (const segment of splitPath(path)) {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      if (!isIndex(segment)) return undefined;
      current = current[Number(segment)];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Returns a copy of `source` with `path` set to `value`.
 *
 * Copies only the containers along the path, so React sees new references
 * exactly where something changed. Missing containers are created from the
 * NEXT segment's shape — a numeric segment makes an array, anything else makes
 * an object — which is what lets a form bind `comparableProjects.0.name`
 * before any project exists.
 */
export function setIn(source: unknown, path: string, value: PathValue): unknown {
  const segments = splitPath(path);
  if (segments.length === 0) return value;

  const [head, ...rest] = segments as [string, ...string[]];
  const nextIsIndex = rest.length > 0 && isIndex(rest[0] as string);

  if (isIndex(head)) {
    const array = Array.isArray(source) ? [...source] : [];
    const index = Number(head);
    array[index] =
      rest.length === 0
        ? value
        : setIn(array[index] ?? (nextIsIndex ? [] : {}), rest.join("."), value);
    return array;
  }

  const object =
    source != null && typeof source === "object" && !Array.isArray(source)
      ? { ...(source as Record<string, unknown>) }
      : {};
  object[head] =
    rest.length === 0
      ? value
      : setIn(object[head] ?? (nextIsIndex ? [] : {}), rest.join("."), value);
  return object;
}

/** Returns a copy of `source` with `path` removed. */
export function deleteIn(source: unknown, path: string): unknown {
  const segments = splitPath(path);
  if (segments.length === 0) return source;

  const last = segments[segments.length - 1] as string;
  const parentPath = segments.slice(0, -1).join(".");
  const parent = parentPath === "" ? source : getIn(source, parentPath);

  if (parent == null || typeof parent !== "object") return source;

  if (Array.isArray(parent)) {
    if (!isIndex(last)) return source;
    const next = parent.filter((_, i) => i !== Number(last));
    return parentPath === "" ? next : setIn(source, parentPath, next);
  }

  const next = { ...(parent as Record<string, unknown>) };
  delete next[last];
  return parentPath === "" ? next : setIn(source, parentPath, next);
}

/** Appends `item` to the array at `path`, creating the array if absent. */
export function appendTo(source: unknown, path: string, item: PathValue): unknown {
  const current = getIn(source, path);
  const array = Array.isArray(current) ? current : [];
  return setIn(source, path, [...array, item]);
}

/** Removes index `index` from the array at `path`. */
export function removeAt(source: unknown, path: string, index: number): unknown {
  const current = getIn(source, path);
  if (!Array.isArray(current)) return source;
  return setIn(
    source,
    path,
    current.filter((_, i) => i !== index),
  );
}

/**
 * Zod issues keyed by dotted path, for direct lookup from an input.
 *
 * Only the FIRST issue per path is kept: showing an input two contradictory
 * messages at once is noise, and the second is usually a consequence of the
 * first.
 */
export function issuesByPath(
  issues: readonly { path: string; message: string }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of issues) {
    if (!(issue.path in map)) map[issue.path] = issue.message;
  }
  return map;
}
