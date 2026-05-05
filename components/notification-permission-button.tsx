"use client";

import { useState, useCallback } from "react";
import { Bell, BellOff } from "lucide-react";
import { registerPush, unregisterPush } from "@/lib/push/register-push";

function getInitialStatus(): "default" | "granted" | "denied" | "unsupported" {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as "default" | "granted" | "denied";
}

export function NotificationPermissionButton() {
  const [status, setStatus] = useState(getInitialStatus);

  const handleToggle = useCallback(async () => {
    if (status === "granted") {
      await unregisterPush();
      setStatus("default");
    } else {
      const sub = await registerPush();
      setStatus(sub ? "granted" : "denied");
    }
  }, [status]);

  if (status === "unsupported") return null;

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-1 text-sm hover:underline"
      title={status === "granted" ? "Tắt thông báo" : "Bật thông báo"}
    >
      {status === "granted" ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {status === "granted" ? "Đang bật" : "Thông báo"}
      </span>
    </button>
  );
}
