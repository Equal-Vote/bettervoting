#!/bin/bash
for i in $(env | grep ^REACT_APP_); do
  key=$(echo $i | cut -d '=' -f 1)
  value=$(echo $i | cut -d '=' -f 2-)
  find /usr/src/app/packages/frontend -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|__${key}__|${value}|g" '{}' \+
done

# favicon.png defaults to the grayscale icon (used on local/dev builds and Netlify PR
# previews, neither of which run this script). Production overrides it with the color one.
cp /usr/src/app/packages/frontend/build/favicon-prod.png /usr/src/app/packages/frontend/build/favicon.png

# Original reference
# https://pamalsahan.medium.com/dockerizing-a-react-application-injecting-environment-variables-at-build-vs-run-time-d74b6796fe38
