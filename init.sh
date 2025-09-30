#!/usr/bin/env bash

DIR=$(realpath $0) && DIR=${DIR%/*}
cd $DIR
set -ex

if ! command -v moonup &>/dev/null; then
cargo install moonup
fi


if [ ! -d "protoc-gen-mbt" ]; then
git clone --depth=1 git@github.com:moonbitlang/protoc-gen-mbt.git
fi

cd protoc-gen-mbt
moonup install lastest
moonup default lastest
moon build -C cli
cd ..

moonup install nightly
moonup default nightly
