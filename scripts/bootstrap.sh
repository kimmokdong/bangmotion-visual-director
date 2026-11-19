#!/usr/bin/env bash
# BangMotion Visual Director — Node.js 준비 (macOS · Linux)
# 관리자 권한(sudo) 없이 동작한다.
#  1) PATH에 Node.js 18 이상이 있으면 그대로 쓴다.
#  2) 없으면 nodejs.org 공식 휴대용 tar.gz(최신 LTS)를 ~/.local/share/bangmotion-visual-director/node 에
#     내려받아 체크섬을 확인하고 푼다.
#  3) scripts/node_modules 가 없으면 그 Node의 npm으로 playwright-core·esbuild를 설치한다.
#  마지막 줄에 NODE=<node 전체 경로> 를 출력한다. 에이전트는 이후 모든 node 명령에 이 경로를 쓴다.
# 실행: bash "<스킬>/scripts/bootstrap.sh" [--portable]
set -euo pipefail
PORTABLE=0
[ "${1:-}" = "--portable" ] && PORTABLE=1
SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
SHARED="${XDG_DATA_HOME:-$HOME/.local/share}/bangmotion-visual-director"
NODE_DIR="$SHARED/node"

major() { "$1" -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || echo 0; }

NODE=""
if [ "$PORTABLE" = 0 ] && command -v node >/dev/null 2>&1 && [ "$(major node)" -ge 18 ]; then NODE="$(command -v node)"; fi
if [ -z "$NODE" ] && [ -x "$NODE_DIR/bin/node" ] && [ "$(major "$NODE_DIR/bin/node")" -ge 18 ]; then NODE="$NODE_DIR/bin/node"; fi

if [ -z "$NODE" ]; then
  case "$(uname -s)" in Darwin) OS=darwin ;; Linux) OS=linux ;; *) echo "지원하지 않는 운영체제입니다: $(uname -s)" >&2; exit 1 ;; esac
  case "$(uname -m)" in arm64|aarch64) ARCH=arm64 ;; x86_64|amd64) ARCH=x64 ;; *) echo "지원하지 않는 CPU입니다: $(uname -m)" >&2; exit 1 ;; esac
  echo "[준비] Node.js(LTS, $OS-$ARCH)를 내려받습니다. 약 40MB, 관리자 권한은 필요 없습니다..."
  VER="$(curl -fsSL https://nodejs.org/dist/index.json | grep -o '"version":"v[0-9.]*"[^}]*"lts":"[^"]*"' | head -1 | sed -E 's/.*"version":"(v[0-9.]+)".*/\1/')"
  [ -n "$VER" ] || { echo "nodejs.org에서 LTS 버전 정보를 찾지 못했습니다." >&2; exit 1; }
  NAME="node-$VER-$OS-$ARCH"
  URL="https://nodejs.org/dist/$VER"
  TMP="$(mktemp -d)"
  curl -fsSL "$URL/$NAME.tar.gz" -o "$TMP/$NAME.tar.gz"
  EXPECTED="$(curl -fsSL "$URL/SHASUMS256.txt" | awk -v f="$NAME.tar.gz" '$2==f {print $1}')"
  ACTUAL="$( (shasum -a 256 "$TMP/$NAME.tar.gz" 2>/dev/null || sha256sum "$TMP/$NAME.tar.gz") | awk '{print $1}')"
  if [ -z "$EXPECTED" ] || [ "$EXPECTED" != "$ACTUAL" ]; then echo "내려받은 Node.js 파일의 체크섬이 맞지 않습니다. 다시 실행해 주세요." >&2; exit 1; fi
  tar -xzf "$TMP/$NAME.tar.gz" -C "$TMP"
  mkdir -p "$SHARED"
  rm -rf "$NODE_DIR"
  mv "$TMP/$NAME" "$NODE_DIR"
  rm -rf "$TMP"
  NODE="$NODE_DIR/bin/node"
  echo "[준비] Node.js $VER 준비 완료"
fi

export PATH="$(dirname "$NODE"):$PATH"
if [ ! -d "$SCRIPTS/node_modules/playwright-core" ] || [ ! -d "$SCRIPTS/node_modules/esbuild" ]; then
  echo "[준비] 필요한 패키지(playwright-core, esbuild)를 설치합니다..."
  (cd "$SCRIPTS" && npm install --no-fund --no-audit --silent)
fi
echo "NODE=$NODE"
