#!/usr/bin/env bash

DIR=$(realpath ${0%/*})
cd $DIR
set -ex

./build.sh
./verNext.js
git add -u
git commit -m.
git pull
git push
cd lib
npm publish --access=public
