/**
 * Base class for entities: objects distinguished by a stable identity rather
 * than by their attribute values.
 */
export abstract class Entity<Id> {
  protected readonly _id: Id;

  protected constructor(id: Id) {
    this._id = id;
  }

  /** The entity's stable identity. */
  get id(): Id {
    return this._id;
  }

  /** Identity equality: same concrete type and equal identifier. */
  equals(other?: Entity<Id> | null): boolean {
    if (other === undefined || other === null) {
      return false;
    }
    if (other.constructor !== this.constructor) {
      return false;
    }
    return idEquals(this._id, other._id);
  }
}

function idEquals<Id>(left: Id, right: Id): boolean {
  if (
    left !== null &&
    right !== null &&
    typeof left === 'object' &&
    typeof right === 'object' &&
    'equals' in left &&
    typeof (left as { equals: unknown }).equals === 'function'
  ) {
    return (left as { equals(other: Id): boolean }).equals(right);
  }
  return left === right;
}
