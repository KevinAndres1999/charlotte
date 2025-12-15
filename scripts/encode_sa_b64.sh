#!/usr/bin/env bash
# Codifica el service account JSON en base64 (Linux/macOS) y lo escribe a stdout
PATH_JSON="/secrets/charlotte-sa.json"
if [ ! -f "$PATH_JSON" ]; then
  echo "Archivo no encontrado: $PATH_JSON" >&2
  exit 1
fi
base64 --wrap=0 "$PATH_JSON"
