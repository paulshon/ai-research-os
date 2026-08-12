export type Locale = "ko" | "en" | "zh";

/** Recursively widen literal strings so all locales share the same shape. */
type DeepString<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly DeepString<U>[]
    : T extends object
      ? { [K in keyof T]: DeepString<T[K]> }
      : T;

export type TranslationDict = DeepString<typeof import("./locales/ko").ko>;
