#!/bin/bash
set -euo pipefail

# Obsidian Blog Sync Script
# 从 Obsidian 博客 Git 仓库同步文章到当前 Astro 项目

DEFAULT_REPO_URL="git@github.com:eddysaynun/edward-obsidian-blog.git"
if [ -n "${OBSIDIAN_BLOG_TOKEN:-}" ] && [ -z "${OBSIDIAN_BLOG_REPO:-}" ]; then
  REPO_URL="https://x-access-token:${OBSIDIAN_BLOG_TOKEN}@github.com/eddysaynun/edward-obsidian-blog.git"
else
  REPO_URL="${OBSIDIAN_BLOG_REPO:-$DEFAULT_REPO_URL}"
fi
FALLBACK_REPO_URL="${OBSIDIAN_BLOG_FALLBACK_REPO:-https://github.com/eddysaynun/edward-obsidian-blog.git}"
REPO_REF="${OBSIDIAN_BLOG_REF:-}"
SOURCE_SUBDIR="${OBSIDIAN_BLOG_SUBDIR:-}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_BLOG="${PROJECT_BLOG:-$PROJECT_ROOT/src/content/blog}"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/obsidian-blog-sync.XXXXXX")"

display_repo_url() {
  echo "$1" | sed -E 's#https://x-access-token:[^@]+@github.com/#https://x-access-token:***@github.com/#'
}

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

echo "同步 Obsidian 博客文章..."

CLONE_ARGS=(--depth 1)
if [ -n "$REPO_REF" ]; then
  CLONE_ARGS+=(--branch "$REPO_REF")
fi

CLONED_FROM="$REPO_URL"
if ! GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -o StrictHostKeyChecking=accept-new}" git clone "${CLONE_ARGS[@]}" "$REPO_URL" "$WORK_DIR/repo"; then
  if [ "$FALLBACK_REPO_URL" = "$REPO_URL" ] || [ -z "$FALLBACK_REPO_URL" ]; then
    exit 1
  fi

  echo "SSH 同步失败，尝试使用 HTTPS 只读地址..." >&2
  GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -o StrictHostKeyChecking=accept-new}" git clone "${CLONE_ARGS[@]}" "$FALLBACK_REPO_URL" "$WORK_DIR/repo"
  CLONED_FROM="$FALLBACK_REPO_URL"
fi

SOURCE_DIR="$WORK_DIR/repo"
if [ -n "$SOURCE_SUBDIR" ]; then
  SOURCE_DIR="$SOURCE_DIR/$SOURCE_SUBDIR"
fi

if [ ! -d "$SOURCE_DIR" ]; then
  echo "错误：源目录不存在：$SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$PROJECT_BLOG"

# 目标目录以远端仓库为准；删除本项目 blog 目录中远端已移除的文件。
find "$PROJECT_BLOG" -mindepth 1 -maxdepth 1 -exec rm -rf {} +

# Cloudflare Pages 构建镜像不一定包含 rsync，使用 POSIX 常见工具同步。
while IFS= read -r -d '' source_file; do
  relative_path="${source_file#$SOURCE_DIR/}"

  case "$relative_path" in
    .git/*|.github/*|.obsidian/*|.trash/*|.DS_Store|.gitignore|README.md)
      continue
      ;;
  esac

  target_file="$PROJECT_BLOG/$relative_path"
  mkdir -p "$(dirname "$target_file")"
  cp "$source_file" "$target_file"
done < <(find "$SOURCE_DIR" -type f -print0)

shopt -s nullglob
posts=("$PROJECT_BLOG"/*.md "$PROJECT_BLOG"/*.mdx)

echo "同步完成。"
echo "源仓库：$(display_repo_url "$CLONED_FROM")"
if [ -n "$REPO_REF" ]; then
  echo "源版本：$REPO_REF"
fi
echo "目标目录：$PROJECT_BLOG"
echo ""
echo "文件统计:"
echo "   - ${#posts[@]} 篇文章"

if [ "${#posts[@]}" -gt 0 ]; then
  echo ""
  echo "最新文章:"
  ls -1t "${posts[@]}" | head -3 | while read -r file; do
    echo "   - $(basename "$file")"
  done
fi
