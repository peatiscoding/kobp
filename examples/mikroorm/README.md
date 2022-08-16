# Working Example

To try:

```sh
# make sure we have updated DB schema.
npm run -w ex-mikroorm migrate:up
# fire up the dev-server!
npm run -w ex-mikroorm example
```

To test:

```sh
# unit + Integral test (no need to run dev-server)
npm run -w ex-mikroorm test:unit
# e2e test need to run dev-server separately.
npm run -w ex-mikroorm test:e2e
```
