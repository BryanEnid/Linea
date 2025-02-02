import React from "react";
import { Button } from "./ui/button";
import { LucideUpload } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useDirectoryStore } from "@/store/directoryStore";

interface FileUploadButtonProps {
  onUpload?: (files: { file: File; content: string }[]) => void; // Updated to pass content with files
  disabled?: boolean;
  accept?: string[];
  children?: React.ReactNode;
}

const inputRef = React.createRef<HTMLInputElement>();

export function FileUploaderButton({ onUpload, disabled, accept, children }: FileUploadButtonProps) {
  const acceptFormat = accept?.join(", ");
  const [key, setKey] = React.useState(0);
  const filesMapRef = React.useRef(new Map<string, File>());
  const { setFiles } = useDirectoryStore();

  const handleFileUpload = (files: { file: File; content: string }[]) => {
    // Transform the files with content into tuples
    const filesForBackend = files.map(({ file, content }) => [file.name, content]);

    // Call the Tauri command
    invoke("upload_files", { files: filesForBackend })
      .then(setFiles)
      .catch((err) => console.error("Upload error:", err));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    const filesMap = filesMapRef.current;

    const res: ArrayBuffer = await invoke("read_file", { path: "C:\\Users\\Bryan\\Desktop\\website.txt" });
    const blob = new Blob([res], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");

    const fileContentPromises: Promise<{ file: File; content: string }>[] = [];

    for (const file of Array.from(files)) {
      const extension = "." + (file.name?.split(".")?.pop() ?? "").toLowerCase();

      // Check for unsupported format
      if (!accept?.includes(extension) && acceptFormat !== undefined) {
        alert(`Not supported format: ${extension}`);
        continue;
      }

      // Avoid duplicates
      if (filesMap.has(file.name)) {
        renameDuplicateFile(file);
      } else {
        filesMap.set(file.name, file);
      }

      // Read file content
      const readFileContent = new Promise<{ file: File; content: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ file, content: reader.result as string });
        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
        reader.readAsText(file); // Read file as text
      });

      fileContentPromises.push(readFileContent);
    }

    try {
      const filesWithContent = await Promise.all(fileContentPromises);
      // onUpload ? onUpload(filesWithContent) : handleFileUpload(filesWithContent); // Pass files with content to parent
    } catch (error) {
      console.error("Error reading files:", error);
    }

    filesMap.clear();
    setKey(key + 1); // Force re-render to replace input element
  };

  const renameDuplicateFile = (file: File) => {
    const filesMap = filesMapRef.current;

    const fileName = file.name.split(".").slice(0, -1).join(".");
    const fileExtension = "." + (file.name?.split(".")?.pop() ?? "").toLowerCase();

    let count = 1;
    let newFileName = `${fileName}(${count})${fileExtension}`;

    while (filesMap.has(newFileName)) {
      count++;
      newFileName = `${fileName}(${count})${fileExtension}`;
    }

    filesMap.set(newFileName, file);
  };

  return (
    <div>
      <input key={key} multiple type="file" accept={acceptFormat} onInput={handleFileChange} style={{ display: "none" }} ref={inputRef} />
      <Button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <LucideUpload /> {children ?? "Upload files"}
      </Button>
    </div>
  );
}
