# Install ABP and Build it

The following script should automatically install all dependencies and build ABP for the first time.

We are currently using `python2` and its `pip` related command so please be sure you have those available.

```sh
#!/usr/bin/env bash

NPM_UNSAFE_PERM="$(npm config get unsafe-perm)"

if [ "$(whoami)" = "root" ] && [ "$NPM_UNSAFE_PERM" != "true" ]; then
  if [ "$(which sudo 2> /dev/null)" != "" ]; then
    sudo npm config set unsafe-perm true
  else
    npm config set unsafe-perm true
  fi
fi

if [ "$(which pip2 2> /dev/null)" != "" ]; then
  if [ "$(which sudo 2> /dev/null)" != "" ]; then
    sudo pip2 install jinja2 fonttools brotli
  else
    pip2 install jinja2 fonttools brotli
  fi
else
  if [ "$(which sudo 2> /dev/null)" != "" ]; then
    sudo pip install jinja2 fonttools brotli
  else
    pip install jinja2 fonttools brotli
  fi
fi

# in CI, be envetually sure there's no adblockpluschrome folder the first time
if [ ! -d adblockpluschrome ]; then
  git clone https://gitlab.com/eyeo/adblockplus/adblockpluschrome.git
fi

cd adblockpluschrome

if [ ! -d node_modules ]; then
  npm i
fi

if [ "$(which python2 2> /dev/null)" != "" ]; then
  python2 ./build.py build -t chrome
else
  python ./build.py build -t chrome
fi

if [ "$(whoami)" = "root" ] && [ "$NPM_UNSAFE_PERM" != "true" ]; then
  if [ "$(which sudo 2> /dev/null)" != "" ]; then
    sudo npm config set unsafe-perm "$NPM_UNSAFE_PERM"
  else
    npm config set unsafe-perm "$NPM_UNSAFE_PERM"
  fi
fi

cd -
```
