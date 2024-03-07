import { Loggy, Middleware } from "kobp";

export const withLabel = (label: string): Middleware => {
  return async (context, next) => {
    Loggy.log(`${label}: before`)
    await next()
    Loggy.log(`${label}: after`)
  }
}
