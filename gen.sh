#!/usr/bin/env bash

DIR=$(realpath $0) && DIR=${DIR%/*}
cd $DIR
set -ex

protoc \
  --plugin=protoc-gen-mbt=$DIR/protoc-gen-mbt/cli/target/native/release/build/protoc-gen-mbt.exe \
  --mbt_out=. \
  --mbt_opt=paths=source_relative,project_name=api \
  data.proto

cd api
moon update
moon build --target js
