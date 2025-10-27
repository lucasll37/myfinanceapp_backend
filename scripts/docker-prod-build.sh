#!/usr/bin/env bash
set -euo pipefail
docker build -t node-ts-app --target prod .
