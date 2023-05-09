import {
  BootstrapModule,
  KobpRouter,
} from 'kobp'

import { makeLambdaHandler } from 'kobp-lambda'
import { HelloController } from '@controllers/hello.controller'

const router = new KobpRouter()
new HelloController().register('/hello', router)

export default makeLambdaHandler(router, {
  customizer: (loader) => {
    loader.addModule(new BootstrapModule(['json']))
  },
  binary: true,
})
