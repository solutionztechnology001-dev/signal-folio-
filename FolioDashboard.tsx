"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Home, FileText, Send, BarChart3, Settings, Search, Plus, Menu, X } from "lucide-react";
import type { ContentItem } from "@/lib/types";
import { useFolio } from "@/lib/useFolio";
import { addContent, addDistribution, addOutcome, markPublished, removeDemo, updateContent } from "@/lib/ops";
import type { OutcomeInput } from "@/lib/ops";
import { platformName } from "@/lib/platforms";
import { downloadText, dateStamp } from "@/lib/browser";
import { exportJson } from "@/lib/store-core";
import { Banner, SmallButton } from "./ui";
import { ContentIntake } from "./ContentIntake";
import { DistributionModal } from "./DistributionModal";
import { PublishModal } from "./PublishModal";
import { OutcomeModal } from "./OutcomeModal";
import { HomeView } from "./views/HomeView";
import type { ViewId } from "./views/HomeView";
import { ContentView } from "./views/ContentView";
import { DistributeView } from "./views/DistributeView";
import { PerformanceView } from "./views/PerformanceView";
import { SettingsView } from "./views/SettingsView";

const NAV: { id: ViewId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "content", label: "Content", icon: FileText },
  { id: "distribute", label: "Distribute", icon: Send },
  { id: "performance", label: "Results", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const TITLES: Record<ViewId, string> = {
  home: "Signal Folio",
  content: "Content",
  distribute: "Distribute",
  performance: "Results",
  settings: "Settings",
};

export function FolioDashboard() {
  const folio = useFolio();
  const { data } = folio;
  const [view, setView] = useState<ViewId>("home");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [intake, setIntake] = useState<{ item?: ContentItem } | null>(null);
  const [planFor, setPlanFor] = useState<{ contentId?: string } | null>(null);
  const [publishFor, setPublishFor] = useState<string | null>(null);
  const [outcomeFor, setOutcomeFor] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };

  const goto = (v: ViewId) => {
    setView(v);
    setMenuOpen(false);
  };

  const hasDemo = data.content.some((c) => c.isDemo);
  const activeContent = data.content.filter((c) => c.status !== "archived");
  const publishDist = publishFor ? data.distributions.find((d) => d.id === publishFor) : undefined;
  const outcomeDist = outcomeFor ? data.distributions.find((d) => d.id === outcomeFor) : undefined;
  const titleOf = (contentId: string) => data.content.find((c) => c.id === contentId)?.title ?? "";

  const downloadBackup = () => downloadText(`signal-folio-backup-${dateStamp()}.json`, exportJson(data));

  if (folio.status === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-white flex-col shrink-0">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-sm">S</div>
            <span className="text-lg font-semibold tracking-tight">Signal Folio</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => goto(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === item.id ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700 text-xs text-slate-400">Publish by hand. Record what really happened.</div>
      </aside>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 text-white flex flex-col">
            <div className="p-5 border-b border-slate-700 flex items-center justify-between">
              <span className="text-lg font-semibold">Signal Folio</span>
              <button onClick={() => setMenuOpen(false)} className="p-2" aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => goto(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                    view === item.id ? "bg-sky-600 text-white" : "text-slate-300"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2 text-slate-600" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base lg:text-lg font-semibold text-slate-900">{TITLES[view]}</h1>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            {view === "content" && (
              <div className="hidden sm:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  placeholder="Search title or tag..."
                  className="pl-9 pr-3 py-1.5 w-40 lg:w-64 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}
            <button
              onClick={() => setIntake({})}
              disabled={folio.readOnly}
              className="flex items-center gap-1.5 px-3 py-1.5 lg:px-4 lg:py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add content</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto pb-24 lg:pb-8">
          <div className="space-y-3 mb-4">
            {folio.readOnly && (
              <Banner
                tone="error"
                actions={
                  <>
                    {folio.rawRecovery !== null && (
                      <SmallButton onClick={() => downloadText(`signal-folio-raw-data-${dateStamp()}.txt`, folio.rawRecovery ?? "", "text/plain")}>
                        Download stored data
                      </SmallButton>
                    )}
                    {folio.status === "corrupt" && (
                      <SmallButton
                        tone="danger"
                        onClick={() => {
                          if (window.confirm("Start fresh? This replaces the damaged stored data with an empty Folio. Download the stored data first.")) {
                            folio.startFresh();
                          }
                        }}
                      >
                        Start fresh
                      </SmallButton>
                    )}
                  </>
                }
              >
                <strong>Saving is turned off.</strong> {folio.notice}
              </Banner>
            )}
            {!folio.readOnly && folio.notice && (
              <Banner tone="info" onDismiss={folio.dismissNotice}>
                {folio.notice}
              </Banner>
            )}
            {folio.saveError && (
              <Banner tone="error" actions={<SmallButton onClick={downloadBackup}>Download backup now</SmallButton>}>
                {folio.saveError}
              </Banner>
            )}
            {hasDemo && (
              <Banner
                tone="warn"
                actions={
                  <SmallButton
                    onClick={() => {
                      const r = folio.run((d) => removeDemo(d));
                      if (!r.ok) notify(r.error);
                    }}
                  >
                    Remove demo data
                  </SmallButton>
                }
              >
                Demo data is loaded. Anything marked DEMO is made up and is not counted in your real results.
              </Banner>
            )}
          </div>

          {view === "home" && <HomeView folio={folio} goto={goto} onAdd={() => setIntake({})} onPlan={() => setPlanFor({})} />}
          {view === "content" && (
            <ContentView
              folio={folio}
              search={search}
              onAdd={() => setIntake({})}
              onEdit={(item) => setIntake({ item })}
              onPlan={(contentId) => setPlanFor({ contentId })}
              notify={notify}
            />
          )}
          {view === "distribute" && (
            <DistributeView folio={folio} onPlan={() => setPlanFor({})} onPublish={setPublishFor} onOutcome={setOutcomeFor} notify={notify} />
          )}
          {view === "performance" && <PerformanceView folio={folio} notify={notify} />}
          {view === "settings" && <SettingsView folio={folio} notify={notify} />}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around py-2 z-30">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => goto(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${view === item.id ? "text-sky-600" : "text-slate-400"}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] bg-slate-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Modals */}
      {intake && (
        <ContentIntake
          initial={intake.item}
          onSubmit={(values) => {
            const item = intake.item;
            return item
              ? folio.run((d) => updateContent(d, item.id, values))
              : folio.run((d) => addContent(d, values));
          }}
          onClose={() => setIntake(null)}
        />
      )}
      {planFor && (
        <DistributionModal
          contents={activeContent}
          initialContentId={planFor.contentId}
          onSubmit={(input) => {
            const r = folio.run((d) => addDistribution(d, input));
            if (r.ok) setView("distribute");
            return r;
          }}
          onClose={() => setPlanFor(null)}
        />
      )}
      {publishDist && (
        <PublishModal
          title={titleOf(publishDist.contentId)}
          platformLabel={platformName(publishDist.platform)}
          onSubmit={(input) => folio.run((d) => markPublished(d, publishDist.id, input))}
          onClose={() => setPublishFor(null)}
        />
      )}
      {outcomeDist && (
        <OutcomeModal
          distributionId={outcomeDist.id}
          title={titleOf(outcomeDist.contentId)}
          platformLabel={platformName(outcomeDist.platform)}
          defaultCurrency={data.settings.currency}
          onSubmit={(input: OutcomeInput) => folio.run((d) => addOutcome(d, input))}
          onClose={() => setOutcomeFor(null)}
        />
      )}
    </div>
  );
}
