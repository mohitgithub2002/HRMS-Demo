import { en } from "./en";
import { hi } from "./hi";
import { enSimple, hiSimple } from "./simple";
import { interpolate, lookup, type DeepStrings, type Locale, type Paths, type Vars } from "@/core/i18n/types";

export type Dictionary = typeof en;
export type TKey = Paths<Dictionary>;
export type TFunction = (key: TKey, vars?: Vars) => string;

// Hindi must have exactly the English keys (tests/unit/i18n.test.ts); the type keeps the shape honest.
const hiChecked: DeepStrings<Dictionary> = hi;

export const dictionaries: Record<Locale, Dictionary> = { en, hi: hiChecked as unknown as Dictionary };
const simpleDictionaries: Record<Locale, unknown> = { en: enSimple, hi: hiSimple };

/**
 * Builds a translator. Missing Hindi falls back to English, never to a raw key. With `simple`, a line that has
 * simpler wording for the simple way of working (src/i18n/simple.ts) uses it.
 */
export function makeT(locale: Locale, simple = false): TFunction {
  const dict = dictionaries[locale];
  const over = simple ? simpleDictionaries[locale] : null;
  return (key, vars) => interpolate((over ? lookup(over, key) : undefined) ?? lookup(dict, key) ?? lookup(en, key) ?? key, vars);
}

/** For dynamic keys such as `permission.${p}` — still falls back safely. */
export function tDynamic(t: TFunction, key: string, vars?: Vars): string {
  return t(key as TKey, vars);
}

export function hasKey(key: string): boolean {
  return lookup(en, key) !== undefined;
}

export type { Locale } from "@/core/i18n/types";
