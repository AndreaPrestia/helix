/**
 * Base class for value objects: immutable, without identity, and compared by
 * structural equality of their properties.
 */
export abstract class ValueObject<Props extends object> {
  protected readonly props: Readonly<Props>;

  protected constructor(props: Props) {
    this.props = Object.freeze({ ...props });
  }

  /** Structural equality: same concrete type and equal properties. */
  equals(other?: ValueObject<Props> | null): boolean {
    if (other === undefined || other === null) {
      return false;
    }
    if (other.constructor !== this.constructor) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
