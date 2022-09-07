# README

The responsibility of each `lambda/handlers/*.ts` file is to map the Controller to the correct lambda. Note that each handler is a isolate Lambda to be deployed.

Finally, all the Lambdas will then be wrapped with `lambda/index.ts`.