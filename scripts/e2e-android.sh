#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXAMPLE_DIR="$ROOT_DIR/example"
AVD_NAME="${AVD_NAME:-Pixel_3a_API_35_extension_level_13_arm64-v8a}"

# Ensure adb is running
adb start-server >/dev/null || true

# Start an emulator if none is running
if ! adb devices | awk 'NR>1 {print $1}' | grep -q '^emulator-'; then
  echo "Starting emulator: $AVD_NAME"
  ( emulator @"$AVD_NAME" -netdelay none -netspeed full >/dev/null 2>&1 & )
  adb wait-for-device >/dev/null
  until adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' | grep -q '^1$'; do
    sleep 2
  done
  sleep 5
fi

# Build & install the example app
cd "$EXAMPLE_DIR"
npx expo prebuild --platform android --no-install --non-interactive
cd android
./gradlew assembleRelease installRelease

# Run Maestro tests
maestro test "$ROOT_DIR/maestro/snapshot.yaml" "$@"
