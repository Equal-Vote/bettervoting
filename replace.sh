#!/bin/bash
for i in $(env | grep ^REACT_APP_); do
  key=$(echo $i | cut -d '=' -f 1)
  value=$(echo $i | cut -d '=' -f 2-)
  find /usr/src/app/packages/frontend -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|__${key}__|${value}|g" '{}' \+
done

# update favicon
find /usr/src/app/packages/frontend -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) -exec sed -i "s|favicon-local|favicon|g" '{}' \+

# Original reference
# https://pamalsahan.medium.com/dockerizing-a-react-application-injecting-environment-variables-at-build-vs-run-time-d74b6796fe38
