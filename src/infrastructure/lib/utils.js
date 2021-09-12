import { monotonicFactory } from 'ulid'
const ulidFactory = monotonicFactory()

export function ulid() {
  return ulidFactory()
}
