"use client";

import { useState } from "react";
import { AlertRuleForm } from "@/components/alert-rule-form";
import { AlertRuleList } from "@/components/alert-rule-list";
import { Separator } from "@/components/ui/separator";

export default function AlertsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Quản lý cảnh báo</h2>
      <AlertRuleForm onCreated={() => setRefreshKey((k) => k + 1)} />
      <Separator className="my-4" />
      <AlertRuleList refreshKey={refreshKey} />
    </div>
  );
}
