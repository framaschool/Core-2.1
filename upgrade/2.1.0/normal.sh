#!/usr/bin/env bash

cd ~/kapu-core
pm2 delete all
git reset --hard
git pull
git checkout master
yarn run bootstrap
yarn run upgrade

# If you do not use Core Commander you can skip this step.
cd ~/kapushell-corr
git reset --hard
git pull
git checkout master
bash kapushellcore.sh
