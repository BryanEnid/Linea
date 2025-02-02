// import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LucideAppWindow, LucideMinus, LucideX } from "lucide-react";
import { ModeToggle } from "./ModeToggle";
import { Button } from "./ui/button";

const appWindow = getCurrentWindow();

export const Titlebar = ({ onMenuClickItem }: { onMenuClickItem: (item: string) => void }) => {
  return (
    <>
      <div
        className="z-50 h-[70px] inset-0 flex justify-between fixed top-0 left-0 right-0 rounded-t-[13px] overflow-hidden pointer-events-auto"
        data-tauri-drag-region>
        <div className="flex justify-center items-center m-3 gap-4">
          <ModeToggle />
          <Button onClick={() => onMenuClickItem("connect")}>Connect</Button>
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
