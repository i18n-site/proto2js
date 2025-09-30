#!/usr/bin/env bash

DIR=$(realpath $0) && DIR=${DIR%/*}
cd $DIR
set -ex

if ! command -v moonup &>/dev/null; then
cargo install moonup
fi


if [ ! -d "protoc-gen-mbt" ]; then
# git clone --depth=1
git clone git@github.com:moonbitlang/protoc-gen-mbt.git
fi

moonup install nightly
moonup default nightly

cd protoc-gen-mbt
moon build -C cli
cd ..
