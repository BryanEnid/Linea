// import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LucideAppWindow, LucideMinus, LucideRefreshCw, LucideRotateCw, LucideX } from "lucide-react";
import { ModeToggle } from "./ModeToggle";
import { Button } from "./ui/button";
import { useConnectStore } from "@/store/connectStore";
import { FileUploaderButton } from "./FileUploaderButton";
import { useDirectoryStore } from "@/store/directoryStore";

const appWindow = getCurrentWindow();

export const Titlebar = ({ onMenuClickItem }: { onMenuClickItem: (item: string) => void }) => {
  const { address, connected } = useConnectStore();
  const { refreshFiles } = useDirectoryStore();

  return (
    <>
      <div
        className="z-50 h-[70px] inset-0 flex justify-between fixed top-0 left-0 right-0 rounded-t-[13px] overflow-hidden pointer-events-auto"
        data-tauri-drag-region>
        <div className="flex justify-center items-center m-3 gap-4">
          <ModeToggle />
          <Button onClick={() => onMenuClickItem("connect")}>{connected ? address : "Connect"}</Button>
          <FileUploaderButton disabled={!connected} />
          <Button variant="outline" size="icon" onClick={() => refreshFiles()}>
            <LucideRotateCw />
          </Button>
        </div>

        <div>
          <div
            className="inline-flex justify-center items-center w-12 h-12 select-none hover:brightness-50 hover:bg-primary-foreground"
            id="titlebar-minimize"
            onClick={() => appWindow.minimize()}>
            <LucideMinus size={16} />
          </div>
          <div
            className="inline-flex justify-center items-center w-12 h-12 select-none hover:brightness-50 hover:bg-primary-foreground"
            id="titlebar-maximize"
            onClick={() => appWindow.toggleMaximize()}>
            <LucideAppWindow size={16} />
          </div>
          <div
            className="inline-flex justify-center items-center w-12 h-12 select-none hover:bg-red-500"
            id="titlebar-close"
            onClick={() => appWindow.close()}>
            <LucideX size={16} />
          </div>
        </div>
      </div>
      <div style={{ height: "70px" }}></div>
    </>
  );
};
