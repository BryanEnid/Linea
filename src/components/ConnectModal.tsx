import React from "react";

import { invoke } from "@tauri-apps/api/core";
import { FileExplorerRow } from "@/types";
import { sortFilesByName } from "@/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { LucideServer, LucideUser } from "lucide-react";
import { Input } from "./ui/input";
import { AnimatedSubscribeButton } from "./ui/animated-subscribe-button";
import { CheckIcon, ChevronDown, ChevronRightIcon, Loader2 } from "lucide-react";

// import { FileUploaderButton } from "@/components/FileUploaderButton";

interface ConnectModalProps {
  show?: boolean;
  onConnected?: (files: FileExplorerRow[]) => void;
  onOpenChange?: (open: boolean) => void;
}

export const ConnectModal = ({ show, onConnected, onOpenChange }: ConnectModalProps) => {
  const [error, setError] = React.useState("");
  const [isConnected, setIsConnected] = React.useState(false);
  const [files, setFiles] = React.useState<FileExplorerRow[]>([]);

  React.useEffect(() => {
    files.length > 0 && onConnected?.(files);
  }, [files]);

  const handleConnect = (e: React.FormEvent<HTMLFormElement>) => {
    const address = e.currentTarget.address.value + ":" + (e.currentTarget.port.value || "21");

    invoke("connect_ftp_server", {
      address: address,
      username: e.currentTarget.username.value,
      password: e.currentTarget.password.value,
    })
      .then((res) => {
        const sortedFiles = sortFilesByName(res as FileExplorerRow[]);
        sortedFiles.unshift({ file_name: "..", file_type: "directory", date: "", size: "0" } as FileExplorerRow);

        setIsConnected(true);
        setError("");
        setFiles(sortedFiles);
      })
      .catch(setError);
  };

  const handleDisconnect = () => {
    invoke("disconnect_ftp_server")
      .then(() => {
        setIsConnected(false);
        setFiles([]);
        setError("");
      })
      .catch((err) => console.error(err));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isConnected) {
      handleConnect(e);
    } else {
      handleDisconnect();
    }
  };

  // const handleFileUpload = (files: { file: File; content: string }[]) => {
  //   // Transform the files with content into tuples
  //   const filesForBackend = files.map(({ file, content }) => [file.name, content]);

  //   // Call the Tauri command
  //   invoke("upload_files", { files: filesForBackend })
  //     .then((res) => {
  //       const sortedFiles = sortFilesByName(res as FileExplorerRow[]);
  //       sortedFiles.unshift({ file_name: "..", file_type: "directory", date: "", size: "0" } as FileExplorerRow);
  //       setFiles(sortedFiles);
  //     })
  //     .catch((err) => console.error("Upload error:", err));
  // };

  return (
    <Dialog open={show} onOpenChange={onOpenChange}>
      <DialogContent title="Connect to your server" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogTitle className="text-xl font-medium text-center">Connect to your server</DialogTitle>
        <div className="flex flex-col items-center">
          <AnimatedBeamConnection />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* <h1>Linea</h1> */}
          <div className="flex flex-col gap-2">
            <label>Address</label>
            <div className="flex flex-row gap-2">
              <Input name="address" type="text" placeholder="Address" required defaultValue={"192.168.1.64"} />
              <Input name="port" type="text" placeholder="Port" required defaultValue={"5000"} />
            </div>
            <div>
              <label>Username</label>
              <Input name="username" type="text" placeholder="Username" required defaultValue={"bt"} />
            </div>
            <div>
              <label>Password</label>
              <Input name="password" type="password" placeholder="Password" required defaultValue={"bt"} />
            </div>
          </div>

          <div>
            {/* <button type="submit">{isConnected ? "Disconnect" : "Connect"}</button> */}
            {/* <FileUploaderButton onUpload={handleFileUpload} disabled={!isConnected}>
          File Upload
        </FileUploaderButton> */}
          </div>

          {error && (
            <pre
              style={{
                wordWrap: "break-word",
                whiteSpace: "pre-wrap",
                padding: "0 15px",
                background: "#e2e2e2",
                border: "1px solid #a1a1a1",
              }}>
              <p style={{ color: "red", fontWeight: "bold" }}>{error}</p>
            </pre>
          )}

          <div className="flex flex-col items-center">
            <AnimatedSubscribeButton className="w-36" type="submit">
              <span className="group inline-flex items-center">Connect</span>
              <span className="group inline-flex items-center ">
                <Loader2 className="animate-spin" />
              </span>
            </AnimatedSubscribeButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Circle = React.forwardRef<HTMLDivElement, { className?: string; children?: React.ReactNode }>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-12 items-center justify-center rounded-full border-2 bg-secondary-foreground p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
        className
      )}>
      {children}
    </div>
  );
});

export function AnimatedBeamConnection() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const div1Ref = React.useRef<HTMLDivElement>(null);
  const div2Ref = React.useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative flex w-full max-w-[340px] items-center justify-center overflow-hidden rounded-lg  bg-background p-4"
      ref={containerRef}>
      <div className="flex size-full flex-col items-stretch justify-between gap-10">
        <div className="flex flex-row justify-between">
          <Circle ref={div1Ref}>
            <LucideUser className="text-secondary" />
          </Circle>

          <Circle ref={div2Ref}>
            <LucideServer className="text-secondary" />
          </Circle>
        </div>
      </div>

      <AnimatedBeam duration={2} containerRef={containerRef} fromRef={div1Ref} toRef={div2Ref} />
    </div>
  );
}
