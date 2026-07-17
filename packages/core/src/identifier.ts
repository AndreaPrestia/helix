import { type Result, err, ok } from './result.js';
import { ValidationError } from './domain-error.js';
import { ValueObject } from './value-object.js';

/**
 * A typed identifier value object. The `Tag` type parameter brands otherwise
 * structurally-identical string identifiers so that, for example, a workspace
 * id cannot be assigned where a project id is expected.
 */
export class Identifier<Tag extends string> extends ValueObject<{
  readonly tag: Tag;
  readonly value: string;
}> {
  private constructor(tag: Tag, value: string) {
    super({ tag, value });
  }

  /** The raw identifier string. */
  get value(): string {
    return this.props.value;
  }

  /** The identifier's tag, distinguishing its kind. */
  get tag(): Tag {
    return this.props.tag;
  }

  override toString(): string {
    return this.props.value;
  }

  /**
   * Create a validated identifier. The value MUST be a non-empty,
   * non-whitespace string.
   */
  static create<Tag extends string>(
    tag: Tag,
    value: string,
  ): Result<Identifier<Tag>, ValidationError> {
    if (value.trim().length === 0) {
      return err(new ValidationError(`identifier "${tag}" must be a non-empty string`));
    }
    return ok(new Identifier(tag, value));
  }
}
