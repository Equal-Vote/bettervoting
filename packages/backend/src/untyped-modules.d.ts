// Ambient declarations for third-party packages with no published or installed types.
// Previously these were pulled in via `require(...)`, which is implicitly `any` and so
// never surfaced a missing-types error; declaring the module here preserves that same
// permissiveness while letting call sites use a real `import`.
declare module 'jsonwebtoken';
declare module 'multer';
