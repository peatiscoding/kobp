#/bin/bash

if [ -z "$1" ]
then
  echo "Incorrect usage:\nUsage: npm_release.sh <package_name> <path>";
  exit 1;
fi

NPM_PACKAGE=$1
NPM_VERSION=$(npm view $NPM_PACKAGE version)
CODE_PATH=$2
CODE_VERSION=$(cat $CODE_PATH/package.json | grep -m 1 version | sed 's/[^0-9.]//g')


echo "(NPM) $NPM_VERSION -> (SOURCE) $CODE_VERSION"

if [ $NPM_PACKAGE == $CODE_VERSION ]
then
  echo "Version already matched nothing to do.";
  exit 0;
fi

echo "Version mismatched releasing new version...";

npm ci
npm run build --workspace=packages/core
npm publish --workspace=packages/core