"use client";

import { useEffect, useState } from "react";
import { Toolbar } from "@/components/layout/Toolbar";
import { SessionStats } from "@/components/session/SessionStats";
import { TabBar, type TabId } from "@/components/tabs/TabBar";
import { SearchBar } from "@/components/search/SearchBar";
import { Timeline } from "@/components/timeline/Timeline";
import { Waterfall } from "@/components/waterfall/Waterfall";
import { CostAnalysis } from "@/components/cost/CostAnalysis";
import { Inspector } from "@/components/inspector/Inspector";
import { TokenStream } from "@/components/replay/TokenStream";
import { ReplayControls } from "@/components/replay/ReplayControls";
import { useSessionStore } from "@/stores/sessionStore";
import { demoSessions } from "@/lib/demo";

export default function DevToolsPage() {
  const { sessions, addSession } = useSessionStore();
  const [activeTab, setActiveTab] = useState<TabId>("timeline");

  useEffect(() => {
    if (sessions.length === 0) {
      demoSessions.forEach(addSession);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0d0d0e] text-[#e8e8ea]">
      <Toolbar />
      <SessionStats />

      {/* Tab bar + search */}
      <TabBar active={activeTab} onChange={setActiveTab} />
      {activeTab !== "cost" && <SearchBar />}

      {/* Main split: tab content | inspector */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {activeTab === "timeline" && <Timeline />}
          {activeTab === "waterfall" && <Waterfall />}
          {activeTab === "cost" && <CostAnalysis />}
        </div>
        <div
          className="overflow-y-auto border-l border-[#2a2a2d] shrink-0"
          style={{ width: 400 }}
        >
          <Inspector />
        </div>
      </div>

      {/* Live token stream during replay */}
      <TokenStream />

      <ReplayControls />
    </div>
  );
}
