"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Users,
  Send,
  Plus,
  Search,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Edit,
  Eye,
  Sparkles,
  Zap,
  RefreshCw,
  Loader2,
  Layers,
  ArrowUpRight,
  ChevronRight,
  FileText,
  UserCheck,
} from "lucide-react";
import { NewsletterCampaign } from "@repo/db";
import {
  getNewsletterStatsAction,
  getSubscribersListAction,
  exportSubscribersCsvAction,
  getCampaignsListAction,
  saveCampaignDraftAction,
  sendCampaignBroadcastAction,
  deleteCampaignAction,
} from "@/actions/newsletter.actions";
import { VisualEmailBuilder } from "@/components/newsletters/VisualEmailBuilder";

interface SubscriberRow {
  id: string;
  email: string;
  userId: string | null;
  isSubscribed: boolean;
  source: string;
  subscribedAt: Date;
  unsubscribedAt: Date | null;
  userName: string | null;
}

export default function NewslettersPage() {
  const [activeTab, setActiveTab] = useState<"subscribers" | "campaigns">("campaigns");

  // Stats
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    activeSubscribers: 0,
    guestSubscribers: 0,
    memberSubscribers: 0,
    totalCampaigns: 0,
    sentCampaigns: 0,
  });

  // Subscribers Tab State
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isSubscribersLoading, setIsSubscribersLoading] = useState(true);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Campaigns Tab State
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [isCampaignsLoading, setIsCampaignsLoading] = useState(true);

  // Builder Modal State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<NewsletterCampaign | null>(null);

  // Preview Modal State
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Load stats
  const loadStats = useCallback(async () => {
    const res = await getNewsletterStatsAction();
    setStats(res);
  }, []);

  // Load subscribers
  const loadSubscribers = useCallback(async () => {
    setIsSubscribersLoading(true);
    try {
      const res = await getSubscribersListAction({
        search: subscriberSearch,
        source: sourceFilter,
        status: statusFilter,
      });
      if (res.success) {
        setSubscribers(res.subscribers as SubscriberRow[]);
      }
    } finally {
      setIsSubscribersLoading(false);
    }
  }, [subscriberSearch, sourceFilter, statusFilter]);

  // Load campaigns
  const loadCampaigns = useCallback(async () => {
    setIsCampaignsLoading(true);
    try {
      const res = await getCampaignsListAction();
      if (res.success) {
        setCampaigns(res.campaigns);
      }
    } finally {
      setIsCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadSubscribers();
    loadCampaigns();
  }, [loadStats, loadSubscribers, loadCampaigns]);

  // Export CSV
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const res = await exportSubscribersCsvAction();
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `south_aero_subscribers_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบแคมเปญนี้?")) return;
    const res = await deleteCampaignAction(id);
    if (res.success) {
      loadCampaigns();
      loadStats();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ──────────────────────────────────────────────────────────
          1. Page Header & Primary Action
      ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E1E1E] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-950/30 text-red-400 border border-red-900/30">
              <Mail size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-heading tracking-wide uppercase text-white">
                NEWSLETTERS &amp; PRODUCT DROPS
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                ศูนย์กลางจัดการผู้ติดตาม และออกแบบจดหมายข่าวการเปิดตัวชุดแต่งใหม่ด้วย Canva-style Builder
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingCampaign(null);
            setIsBuilderOpen(true);
          }}
          className="btn-primary flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase shadow-lg shadow-red-900/30 cursor-pointer self-start sm:self-auto"
          id="btn-create-campaign"
        >
          <Plus size={16} />
          <span>สร้างข่าวสารใหม่ (NEW CAMPAIGN)</span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────
          2. Metrics Overview Cards
      ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider">Total Audience</span>
            <Users size={16} className="text-red-400" />
          </div>
          <p className="text-2xl font-black font-heading text-white">{stats.totalSubscribers}</p>
          <p className="text-[0.65rem] text-gray-500 mt-1">ผู้ติดตามทั้งหมดในระบบ</p>
        </div>

        <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider">Active Subscribers</span>
            <UserCheck size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black font-heading text-emerald-400">{stats.activeSubscribers}</p>
          <p className="text-[0.65rem] text-gray-500 mt-1">พร้อมรับข่าวสารปัจจุบัน</p>
        </div>

        <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider">Member vs Guest</span>
            <Sparkles size={16} className="text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black font-heading text-white">{stats.memberSubscribers}</p>
            <span className="text-xs text-gray-500 font-mono">/ {stats.guestSubscribers} guests</span>
          </div>
          <p className="text-[0.65rem] text-gray-500 mt-1">สมาชิกที่ Opt-in vs หน้าร้าน</p>
        </div>

        <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider">Broadcasts Sent</span>
            <Send size={16} className="text-blue-400" />
          </div>
          <p className="text-2xl font-black font-heading text-white">{stats.sentCampaigns}</p>
          <p className="text-[0.65rem] text-gray-500 mt-1">จากทั้งหมด {stats.totalCampaigns} แคมเปญ</p>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          3. Tab Navigation
      ────────────────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-[#222222] gap-2 sm:gap-4 select-none">
        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "campaigns"
              ? "border-red-500 text-white bg-red-950/10"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Layers size={15} />
          <span>แคมเปญ &amp; จดหมายข่าว ({campaigns.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("subscribers")}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "subscribers"
              ? "border-red-500 text-white bg-red-950/10"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Users size={15} />
          <span>รายชื่อผู้ติดตาม ({subscribers.length})</span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────
          4. TAB 1: CAMPAIGNS & COMPOSER
      ────────────────────────────────────────────────────────── */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              จดหมายข่าวสารการเปิดตัวชิ้นส่วนและรายงาน CFD ที่สร้างและบันทึกไว้ในระบบ
            </p>
            <button
              type="button"
              onClick={loadCampaigns}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C1C1C] transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {isCampaignsLoading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
              <Loader2 size={28} className="animate-spin text-red-500 mb-2" />
              <p className="text-xs">กำลังโหลดแคมเปญ...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-[#121212] border border-dashed border-[#262626] flex flex-col items-center justify-center">
              <Mail size={36} className="text-gray-600 mb-3" />
              <h3 className="text-sm font-bold text-white uppercase">ยังไม่มีแคมเปญข่าวสาร</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                เริ่มต้นออกแบบจดหมายข่าวสารเปิดตัวชุดแต่งใหม่ด้วย Canva-style Builder ตอนนี้
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingCampaign(null);
                  setIsBuilderOpen(true);
                }}
                className="btn-primary text-xs px-5 py-2 mt-4 rounded font-bold uppercase"
              >
                + สร้างแคมเปญแรก
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((camp) => {
                const isSent = camp.status === "sent";

                return (
                  <div
                    key={camp.id}
                    className="rounded-xl bg-[#121212] border border-[#222222] hover:border-[#333333] transition-all p-5 flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      {/* Status Badge & Actions */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`text-[0.62rem] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5 ${
                            isSent
                              ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                              : "bg-amber-950/40 text-amber-400 border border-amber-800/40"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSent ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                            }`}
                          />
                          {camp.status}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewHtml(camp.contentHtml)}
                            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#1E1E1E]"
                            title="Preview HTML"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCampaign(camp);
                              setIsBuilderOpen(true);
                            }}
                            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#1E1E1E]"
                            title="Edit in Canvas"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCampaign(camp.id)}
                            className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-[#1E1E1E]"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-heading font-bold text-base text-white group-hover:text-red-400 transition-colors line-clamp-1">
                        {camp.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 font-mono line-clamp-1">
                        {camp.subject}
                      </p>
                      {camp.previewText && (
                        <p className="text-[0.7rem] text-gray-500 mt-1.5 line-clamp-2">
                          {camp.previewText}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#1C1C1C] flex items-center justify-between text-[0.68rem] text-gray-500 font-mono">
                      <span>
                        {isSent && camp.sentAt
                          ? `Sent: ${new Date(camp.sentAt).toLocaleDateString("th-TH")}`
                          : `Created: ${new Date(camp.createdAt).toLocaleDateString("th-TH")}`}
                      </span>
                      {isSent && (
                        <span className="text-emerald-400 font-bold">
                          {camp.recipientCount} Recipients
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          5. TAB 2: SUBSCRIBERS AUDIENCE LIST
      ────────────────────────────────────────────────────────── */}
      {activeTab === "subscribers" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121212] p-3 rounded-xl border border-[#222222]">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={subscriberSearch}
                  onChange={(e) => setSubscriberSearch(e.target.value)}
                  placeholder="ค้นหาอีเมล หรือชื่อผู้รับ..."
                  className="w-full bg-[#181818] border border-[#2B2B2B] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                />
              </div>

              {/* Source Filter */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-[#181818] border border-[#2B2B2B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="all">ทุกแหล่งที่มา (All Sources)</option>
                <option value="signup">ตอนสมัครสมาชิก (Sign-Up)</option>
                <option value="1click_banner">1-Click Banner หน้าร้าน</option>
                <option value="homepage_banner">Guest Homepage Banner</option>
                <option value="footer">Footer Strip</option>
                <option value="profile">Profile Setting</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#181818] border border-[#2B2B2B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="all">ทุกสถานะ (All Status)</option>
                <option value="active">Active (รับข่าวสาร)</option>
                <option value="unsubscribed">Unsubscribed (ยกเลิก)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExportingCsv}
              className="px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] border border-[#2E2E2E] text-xs font-semibold text-gray-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isExportingCsv ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>Export CSV</span>
            </button>
          </div>

          {/* Subscribers Table */}
          <div className="rounded-xl bg-[#121212] border border-[#222222] overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181818] border-b border-[#242424] text-gray-400 uppercase font-heading tracking-wider">
                    <th className="p-3.5 pl-5">Email Address</th>
                    <th className="p-3.5">Customer Name</th>
                    <th className="p-3.5">Source</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-5">Subscribed Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]">
                  {isSubscribersLoading ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-gray-500">
                        <Loader2 size={24} className="animate-spin text-red-500 mx-auto mb-2" />
                        <span>กำลังโหลดรายชื่อผู้ติดตาม...</span>
                      </td>
                    </tr>
                  ) : subscribers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-gray-500">
                        ไม่พบรายชื่อผู้ติดตามตามเงื่อนไขที่ค้นหา
                      </td>
                    </tr>
                  ) : (
                    subscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5 pl-5 font-mono text-white font-medium">
                          {sub.email}
                        </td>
                        <td className="p-3.5 text-gray-300">
                          {sub.userName ? (
                            <span className="font-semibold text-white">{sub.userName}</span>
                          ) : (
                            <span className="text-gray-600 italic">Guest (หน้าร้าน)</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-[#1C1C1C] border border-[#282828] text-[0.65rem] text-gray-400 font-mono">
                            {sub.source}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {sub.isSubscribed ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold text-[0.7rem]">
                              <CheckCircle2 size={13} />
                              <span>Subscribed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-gray-500 text-[0.7rem]">
                              <XCircle size={13} />
                              <span>Unsubscribed</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 pr-5 text-gray-400 font-mono text-[0.7rem]">
                          {new Date(sub.subscribedAt).toLocaleString("th-TH")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          6. Full-Screen Visual Email Builder Modal
      ────────────────────────────────────────────────────────── */}
      {isBuilderOpen && (
        <VisualEmailBuilder
          initialCampaign={editingCampaign}
          onSaveDraft={async (data) => {
            const res = await saveCampaignDraftAction(data);
            if (res.success) {
              loadCampaigns();
              loadStats();
            }
            return res;
          }}
          onSendBroadcast={async (data) => {
            const res = await sendCampaignBroadcastAction(data);
            if (res.success) {
              loadCampaigns();
              loadStats();
            }
            return res;
          }}
          onClose={() => setIsBuilderOpen(false)}
        />
      )}

      {/* ──────────────────────────────────────────────────────────
          7. HTML Preview Modal
      ────────────────────────────────────────────────────────── */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl bg-[#121212] border border-[#2A2A2A] rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#222222] bg-[#181818]">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-red-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Email Live Render Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewHtml(null)}
                className="p-1.5 rounded text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-[#080808]">
              <iframe
                srcDoc={previewHtml}
                title="Email Preview"
                className="w-full h-[600px] border border-[#262626] rounded bg-[#0A0A0A]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
