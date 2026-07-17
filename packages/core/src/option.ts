/** Present branch of an {@link Option}. */
export interface Some<T> {
  readonly some: true;
  readonly value: T;
}

/** Absent branch of an {@link Option}. */
export interface None {
  readonly some: false;
}

/** An explicit optional value, avoiding `null`/`undefined` ambiguity. */
export type Option<T> = Some<T> | None;

const NONE: None = { some: false };

/** Construct a present {@link Option}. */
export function some<T>(value: T): Some<T> {
  return { some: true, value };
}

/** The absent {@link Option}. */
export function none(): None {
  return NONE;
}

/** Build an {@link Option} from a possibly nullish value. */
export function fromNullable<T>(value: T | null | undefined): Option<T> {
  return value === null || value === undefined ? NONE : some(value);
}

/** Type guard narrowing an {@link Option} to its present branch. */
export function isSome<T>(option: Option<T>): option is Some<T> {
  return option.some;
}

/** Type guard narrowing an {@link Option} to its absent branch. */
export function isNone<T>(option: Option<T>): option is None {
  return !option.some;
}

/** Transform a present value, leaving an absent option untouched. */
export function mapOption<T, U>(option: Option<T>, fn: (value: T) => U): Option<U> {
  return option.some ? some(fn(option.value)) : NONE;
}

/** Return the present value or the provided fallback. */
export function getOrElse<T>(option: Option<T>, fallback: T): T {
  return option.some ? option.value : fallback;
}
