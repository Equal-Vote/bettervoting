// catch(err) always types err as unknown; this extracts a loggable message
// regardless of whether the thrown value was an Error or something else.
// Deliberately dependency-free (unlike Util.ts, which has a ServiceLocator
// side effect at import time) so importing it can't introduce new module
// load-order cycles.
export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Node/pg errors (e.g. ERR_STREAM_PREMATURE_CLOSE, Postgres's 42P01) attach a
// `code` string but aren't necessarily Error instances, so this narrows unknown
// catch values without assuming a specific error shape.
export function hasErrorCode(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === code;
}
