#!/usr/bin/env bash

cd ~/kapu-core
pm2 delete kapu-core
pm2 delete ark-core-relay
git reset --hard
git pull
git checkout master
yarn run bootstrap
yarn run upgrade

pm2 --name 'ark-core-relay' start ~/kapu-core/packages/core/dist/index.js -- relay --network mainnet
