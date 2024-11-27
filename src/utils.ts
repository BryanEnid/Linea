import { File } from "./types";

export const sizeFormatter = (bytes: number) => {
  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let unitIndex = 0;
  while (bytes >= 1024) {
    bytes /= 1024;
    unitIndex++;
  }

  if (unitIndex === 0) return "";

  return `${bytes.toFixed(2)} ${units[unitIndex]}`;
};

export const dateFormatter = (date: string) => {
  const dateObj = new Date(date);
  return dateObj.toLocaleString("default", { month: "long", day: "numeric", year: "numeric" });
};

export const sortFilesByName = (files: File[], ascending = true) => {
  return files.sort((a, b) => (ascending ? a.file_name.localeCompare(b.file_name) : b.file_name.localeCompare(a.file_name)));
};
