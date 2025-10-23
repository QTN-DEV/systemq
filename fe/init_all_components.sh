#!/usr/bin/env bash
set -euo pipefail

# ==========================================
# shadcn/ui bulk installer via bunx
# ==========================================

# --- checks ---
if ! command -v bun >/dev/null 2>&1; then
  echo "❌ Bun tidak ditemukan. Install dulu: https://bun.sh"
  exit 1
fi

if ! command -v bunx >/dev/null 2>&1; then
  echo "❌ bunx tidak tersedia. Pastikan versi Bun terbaru terpasang."
  exit 1
fi

if [ ! -f "package.json" ]; then
  echo "❌ package.json tidak ditemukan. Jalankan script ini di root project."
  exit 1
fi

# --- components mapping (human label -> registry slug) ---
# Pastikan slug sesuai registry shadcn/ui
declare -A MAP
MAP["Accordion"]="accordion"
MAP["Alert"]="alert"
MAP["Alert Dialog"]="alert-dialog"
MAP["Aspect Ratio"]="aspect-ratio"
MAP["Avatar"]="avatar"
MAP["Badge"]="badge"
MAP["Breadcrumb"]="breadcrumb"
MAP["Button"]="button"
MAP["Calendar"]="calendar"
MAP["Card"]="card"
MAP["Carousel"]="carousel"
MAP["Chart"]="chart"
MAP["Checkbox"]="checkbox"
MAP["Collapsible"]="collapsible"
MAP["Command"]="command"
MAP["Context Menu"]="context-menu"
MAP["Dialog"]="dialog"
MAP["Drawer"]="drawer"
MAP["Dropdown Menu"]="dropdown-menu"
MAP["React Hook Form"]="form"
MAP["Hover Card"]="hover-card"
MAP["Input"]="input"
MAP["Input OTP"]="input-otp"
MAP["Label"]="label"
MAP["Menubar"]="menubar"
MAP["Navigation Menu"]="navigation-menu"
MAP["Pagination"]="pagination"
MAP["Popover"]="popover"
MAP["Progress"]="progress"
MAP["Radio Group"]="radio-group"
MAP["Resizable"]="resizable"
MAP["Scroll-area"]="scroll-area"
MAP["Select"]="select"
MAP["Separator"]="separator"
MAP["Sheet"]="sheet"
MAP["Sidebar"]="sidebar"
MAP["Skeleton"]="skeleton"
MAP["Slider"]="slider"
MAP["Sonner"]="sonner"
MAP["Switch"]="switch"
MAP["Table"]="table"
MAP["Tabs"]="tabs"
MAP["Textarea"]="textarea"
MAP["Toggle"]="toggle"
MAP["Toggle Group"]="toggle-group"
MAP["Tooltip"]="tooltip"

# --- ordered list from your request ---
ORDERED_LABELS=(
  "Accordion"
  "Alert"
  "Alert Dialog"
  "Aspect Ratio"
  "Avatar"
  "Badge"
  "Breadcrumb"
  "Button"
  "Calendar"
  "Card"
  "Carousel"
  "Chart"
  "Checkbox"
  "Collapsible"
  "Command"
  "Context Menu"
  "Dialog"
  "Drawer"
  "Dropdown Menu"
  "React Hook Form"
  "Hover Card"
  "Input"
  "Input OTP"
  "Label"
  "Menubar"
  "Navigation Menu"
  "Pagination"
  "Popover"
  "Progress"
  "Radio Group"
  "Resizable"
  "Scroll-area"
  "Select"
  "Separator"
  "Sheet"
  "Sidebar"
  "Skeleton"
  "Slider"
  "Sonner"
  "Switch"
  "Table"
  "Tabs"
  "Textarea"
  "Toggle"
  "Toggle Group"
  "Tooltip"
)

# --- shadcn init (idempotent) ---
echo "🚀 Menjalankan shadcn init..."

# --- install loop ---
failures=()

install_component () {
  local slug="$1"
  echo "➕ Menambahkan komponen: ${slug}"
  if ! bunx --bun shadcn@latest add "${slug}" -y; then
    failures+=("${slug}")
  fi
}

for label in "${ORDERED_LABELS[@]}"; do
  slug="${MAP[$label]:-}"
  if [ -z "${slug}" ]; then
    echo "⚠️  Tidak ada mapping untuk: ${label} — dilewati."
    continue
  fi
  install_component "${slug}"
done

echo
if [ "${#failures[@]}" -gt 0 ]; then
  echo "❗ Ada komponen gagal di-install:"
  for f in "${failures[@]}"; do
    echo "   - ${f}"
  done
  echo "Coba ulangi komponen gagal tersebut secara manual, contoh:"
  echo "bunx --bun shadcn@latest add ${failures[0]} -y"
  exit 2
else
  echo "✅ Semua komponen berhasil dipasang."
fi