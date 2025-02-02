import { FileExplorerRow } from "./types";

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

export const sortFilesByName = (files: FileExplorerRow[], ascending = true) => {
  return files.sort((a, b) => (ascending ? a.file_name.localeCompare(b.file_name) : b.file_name.localeCompare(a.file_name)));
};

export const sortFilesByType = (files: FileExplorerRow[], ascending = true) => {
  // sort the files type equal to "directory" to the top
  return files.sort((a, b) => {
    if (a.file_type === "directory" && b.file_type !== "directory") return -1;
    if (b.file_type === "directory" && a.file_type !== "directory") return 1;
    return ascending ? a.file_type.localeCompare(b.file_type) : b.file_type.localeCompare(a.file_type);
  });
};
