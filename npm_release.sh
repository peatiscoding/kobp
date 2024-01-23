#/bin/bash

if [ -z "$1" ]
then
  echo "Incorrect usage:\nUsage: npm_release.sh <path_to_package.json>";
  exit 1;
fi

CODE_PATH=$1
if [ ! -f "$CODE_PATH/package.json" ]
then
  echo "$CODE_PATH/package.json does not exists."
  exit 1;
fi

NPM_PACKAGE=$(cat $CODE_PATH/package.json | grep -m 1 name | sed 's/"name": "\(.*\)",/\1/g')
NPM_VERSION=$(npm view $NPM_PACKAGE version || echo 0.0.0)
CODE_VERSION=$(cat $CODE_PATH/package.json | grep -m 1 version | sed 's/[^0-9.]//g')

echo "(NPM) '$NPM_VERSION' -> (SOURCE) '$CODE_VERSION'"

if [ "$NPM_VERSION" = "$CODE_VERSION" ]
then
  echo "Version already matched nothing to do. bye..";
  exit 0;
fi

echo "Version mismatched releasing new version...";
cp README.md $CODE_PATH/readme.md
npm run build --workspace=$CODE_PATH && npm publish --workspace=$CODE_PATH
