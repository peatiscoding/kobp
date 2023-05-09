import type { AWS } from '@serverless/typescript'
import functions from '@lambdas/definitions'

const serverlessConfiguration: AWS = {
  service: 'kobp-ex-sls',
  frameworkVersion: '3',
  package: {
    individually: true,
  },
  plugins: [
    'serverless-esbuild',
    'serverless-offline',
  ],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    region: 'ap-southeast-1',
    stage: 'dev',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: false,
      binaryMediaTypes: [
        '*/*',
      ],
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      LOCAL_S3_ENDPOINT: 'http://localhost:9000',
      LOCAL_S3_ACCESS_KEY: 'root',
      LOCAL_S3_SECRET_KEY: 'password',
      MEDIA_BUCKET_EXPENSE_DOCS: 'mzic-local-expense-docs',
      LOGGY_FORMAT: 'TXT',
      STAGE: '${self:custom.stage}',
    },
    iamRoleStatements: [
    ],
  },
  resources: {
  },
  custom: {
    stage: '${opt:stage, self:provider.stage}',
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      watch: {
        pattern: ['src/**/*.ts'],
        ignore: ['temp/**/*'],
      },
      platform: 'node',
      concurrency: 10,
    },
  },
  functions,
}

module.exports = serverlessConfiguration
