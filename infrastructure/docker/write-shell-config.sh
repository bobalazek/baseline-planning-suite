#!/bin/sh
# Writes the shell's runtime configuration from environment variables, at container start.
#
# This is the whole of "remote URLs resolve at runtime from container configuration, never from the
# bundle". The shell image contains no remote URL at all; moving People to another host is an
# environment variable and a restart, not a rebuild.
set -eu

[ -n "${PEOPLE_REMOTE_ENTRY:-}" ] || exit 0

: "${DELIVERY_REMOTE_ENTRY:?DELIVERY_REMOTE_ENTRY must be set alongside PEOPLE_REMOTE_ENTRY}"

envsubst '${PEOPLE_REMOTE_ENTRY} ${DELIVERY_REMOTE_ENTRY}' \
  < /etc/baseline/config.template.json \
  > /usr/share/nginx/html/config.json

echo "shell config written:"
cat /usr/share/nginx/html/config.json
