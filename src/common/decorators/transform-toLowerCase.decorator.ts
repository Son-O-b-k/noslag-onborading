import { Transform } from 'class-transformer';

export function TransformLowerCase() {
  return Transform(({ value }) => (value ? value.toLowerCase() : value));
}
