import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, startOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to Indonesian locale
export function formatDate(date: string | Date, fmt = "dd MMMM yyyy") {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt, { locale: idLocale });
}

export function formatDateShort(date: string | Date) {
  return formatDate(date, "d MMM yyyy");
}

export function formatDateTime(date: string | Date) {
  return formatDate(date, "dd MMM yyyy, HH:mm");
}

export function formatDuration(hours: number | null): string {
  if (!hours) return "–";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h} jam`;
  return `${h} jam ${m} menit`;
}

// Get current week range
export function getWeekRange() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1, locale: idLocale });
  return { start, end: now };
}

// Get current month range
export function getMonthRange() {
  const now = new Date();
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

// Generate Drive filename: YYYYMMDD_deskripsi_urutan.ext
export function generateDriveFilename(
  date: string,
  description: string,
  index: number,
  originalName: string
): string {
  const dateStr = format(parseISO(date), "yyyyMMdd");
  const desc = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 30);
  const ext = originalName.split(".").pop() || "bin";
  return `${dateStr}_${desc}_${index + 1}.${ext}`;
}

// Get Drive folder name from date: YYYY-MM
export function getDriveFolderName(date: string): string {
  return format(parseISO(date), "yyyy-MM");
}

// File type detection
export function getFileType(mimeType: string): 'image' | 'pdf' | 'docx' | 'xlsx' | 'other' {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("wordprocessingml") || mimeType.includes("msword")) return "docx";
  if (mimeType.includes("spreadsheetml") || mimeType.includes("excel")) return "xlsx";
  return "other";
}

// Format file size
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "–";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "…";
}

// Get month name in Indonesian
export function getMonthName(month: number): string {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  return months[month - 1] || "";
}

// Color palette for categories
export const CATEGORY_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
  "#EF4444", "#06B6D4", "#F97316", "#84CC16", "#6366F1"
];

// Default category icons
export const CATEGORY_ICONS = [
  "briefcase", "book", "users", "monitor", "file-text",
  "calendar", "star", "target", "zap", "globe"
];

// Parse internal links [[...]] from Tiptap content text
export function parseInternalLinks(text: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    links.push(match[1]);
  }
  return links;
}
