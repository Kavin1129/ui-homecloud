#!/bin/sh
set -eu

: "${HOME_CLOUD_API_BASE_URL:?Set HOME_CLOUD_API_BASE_URL to same-origin or a browser-reachable HTTPS API origin}"

case "$HOME_CLOUD_API_BASE_URL" in
  same-origin) api_base_url=''; api_origin='' ;;
  https://*)
    case "$HOME_CLOUD_API_BASE_URL" in
      *[!a-zA-Z0-9._:/-]*) echo "HOME_CLOUD_API_BASE_URL must be an HTTPS origin with an optional path" >&2; exit 1 ;;
    esac
    api_base_url="$HOME_CLOUD_API_BASE_URL"
    api_authority="${HOME_CLOUD_API_BASE_URL#https://}"
    api_authority="${api_authority%%/*}"
    case "$api_authority" in
      ''|.*|*..*|*:) echo "HOME_CLOUD_API_BASE_URL must include a valid HTTPS host" >&2; exit 1 ;;
    esac
    api_origin="https://$api_authority"
    ;;
  http://localhost|http://localhost:*|http://127.0.0.1|http://127.0.0.1:*)
    api_base_url="$HOME_CLOUD_API_BASE_URL"
    api_authority="${HOME_CLOUD_API_BASE_URL#http://}"
    api_authority="${api_authority%%/*}"
    api_origin="http://$api_authority"
    ;;
  *) echo "Use same-origin, an HTTPS API URL, or localhost HTTP for local testing" >&2; exit 1 ;;
esac

encoded_api_base_url="$(printf '%s' "$api_base_url" | base64 | tr -d '\n')"
printf 'window.__HOME_CLOUD_CONFIG__ = { apiBaseUrl: atob("%s") };\n' "$encoded_api_base_url" \
  > /tmp/homecloud-runtime-config.js
printf "add_header Content-Security-Policy \"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' %s\" always;\n" \
  "$api_origin" > /tmp/homecloud-csp.conf
