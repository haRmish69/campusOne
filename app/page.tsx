"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS — inline SVGs matching the reference HTML exactly
   ═══════════════════════════════════════════════════════════════════════════ */
const SparkleIcon = ({ size = 16, fill = true }: { size?: number; fill?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.5 7L22 11l-7.5 2L12 22l-2.5-7L2 13l7.5-2z" /></svg>
);
const BellIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
);
const ChatIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
);
const ClockIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const ShieldIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
);
const ForkIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1 .5 2 2 2s2-1 2-2V2M5 11v11M19 2c-2 1-3 3-3 5v4c0 1 1 2 2 2h2M19 11v11" /></svg>
);
const AlarmIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M5 3 2 6M22 6l-3-3M9 1h6" /></svg>
);
const CalendarIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
);
const CompassIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
);
const HeartIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></svg>
);
const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 19v3" /></svg>
);
const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
);
const BriefcaseIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
);
const CarIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14M5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM3 17V11l2-5h12l3 5v6" /></svg>
);
const UsersIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   SHOWCASE DATA
   ═══════════════════════════════════════════════════════════════════════════ */
const showcaseItems = [
  { key: "chat", icon: <ChatIcon />, title: "AI Chat", desc: "Ask anything about your campus — schedules, notices, mess menus — and get instant answers, voice input supported." },
  { key: "notices", icon: <BellIcon />, title: "Smart Notices", desc: "Upload or sync any notice. AI extracts what matters and tells you exactly what to do about it." },
  { key: "mess", icon: <ForkIcon />, title: "Mess Menu, Decoded", desc: "Snap a photo of the mess menu. AI parses every dish and flags veg/non-veg automatically." },
  { key: "deadlines", icon: <AlarmIcon />, title: "Deadline Brain", desc: "Upload a syllabus and AI extracts every deadline straight into your tracker — never miss a submission again." },
  { key: "schedule", icon: <CalendarIcon />, title: "Smart Schedule", desc: "Your weekly timetable, AI study plans, and today's classes at a glance." },
  { key: "ecosystem", icon: <CompassIcon />, title: "Campus Ecosystem", desc: "Placement Hub, Travel Pool, and Study Peers — connect with what's happening across campus." },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SHOWCASE PANELS
   ═══════════════════════════════════════════════════════════════════════════ */
function PanelChat() {
  return (<>
    <div className="lp-panel-title"><ChatIcon /> AI Chat</div>
    <div className="lp-chat-bubble">Today&apos;s lunch is Roti, Dal Fry, Rice, and Orange. It&apos;s marked as <span className="lp-veg">VEG</span>.</div>
    <div className="lp-input-bar">
      <div className="lp-mic"><MicIcon /></div>
      <span>Ask anything...</span>
      <div className="lp-send"><SendIcon /></div>
    </div>
  </>);
}
function PanelNotices() {
  return (<>
    <div className="lp-panel-title"><BellIcon /> Smart Notices</div>
    <div className="lp-notice-card">
      <div className="lp-notice-meta"><span className="lp-tag-pill">Exam</span><span className="lp-when">in 2 days</span></div>
      <h5>Mid-Semester Examination (CS-202) Rescheduled</h5>
      <div className="lp-ai-action"><SparkleIcon size={16} /> AI Action: Bring your physical ID card and arrive 15 minutes early.</div>
    </div>
  </>);
}
function PanelMess() {
  return (<>
    <div className="lp-panel-title"><ForkIcon /> Today&apos;s Menu</div>
    {[
      { meal: "Breakfast", veg: false, items: "Boiled Eggs, Toast, Cornflakes" },
      { meal: "Lunch", veg: true, items: "Roti, Dal Fry, Rice, Orange" },
      { meal: "Evening", veg: true, items: "Tea with Biscuits" },
      { meal: "Dinner", veg: false, items: "Kadai Chicken, Roti, Dal Tadka" },
    ].map((r) => (
      <div key={r.meal} className="lp-menu-row">
        <span className="lp-meal">{r.meal}</span>
        <span className={`lp-veg-dot ${r.veg ? "green" : "red"}`} />
        <span>{r.items}</span>
      </div>
    ))}
  </>);
}
function PanelDeadlines() {
  return (<>
    <div className="lp-panel-title"><AlarmIcon /> Deadline Brain</div>
    {[
      { name: "OS Assignment 3", due: "in 3 days" },
      { name: "DBMS Lab Report", due: "in 5 days" },
      { name: "CS-301 Project Proposal", due: "in 12 days" },
    ].map((d) => (
      <div key={d.name} className="lp-deadline-row">
        <span className="lp-dl-icon"><CalendarIcon size={18} /></span>
        <span>{d.name}</span>
        <span className="lp-due">{d.due}</span>
      </div>
    ))}
  </>);
}
function PanelSchedule() {
  return (<>
    <div className="lp-panel-title"><CalendarIcon /> Today&apos;s Schedule</div>
    {[
      { time: "09:00", name: "OR", active: false },
      { time: "10:00", name: "DBMS", active: false },
      { time: "11:00", name: "Real Analysis", active: true },
      { time: "12:00", name: "OS", active: false },
      { time: "16:00", name: "DBMS Lab", active: false },
    ].map((c) => (
      <div key={c.time} className={`lp-class-row ${c.active ? "active" : ""}`}>
        <span className="lp-time">{c.time}</span><span className="lp-dot" /><span className="lp-name">{c.name}</span>
      </div>
    ))}
  </>);
}
function PanelEcosystem() {
  return (<>
    <div className="lp-panel-title"><CompassIcon /> Campus Ecosystem</div>
    {[
      { icon: <BriefcaseIcon />, title: "Placement Hub", meta: "12 new interview experiences this week" },
      { icon: <CarIcon />, title: "Travel Pool", meta: "4 cab pools heading your way" },
      { icon: <UsersIcon />, title: "Study Peers", meta: "3 students requesting help nearby" },
    ].map((e) => (
      <div key={e.title} className="lp-eco-row">
        <span className="lp-eco-icon">{e.icon}</span>
        <div><div>{e.title}</div><div className="lp-eco-meta">{e.meta}</div></div>
      </div>
    ))}
  </>);
}

const panelMap: Record<string, () => React.JSX.Element> = {
  chat: PanelChat, notices: PanelNotices, mess: PanelMess,
  deadlines: PanelDeadlines, schedule: PanelSchedule, ecosystem: PanelEcosystem,
};

/* ═══════════════════════════════════════════════════════════════════════════
   REVEAL HOOK
   ═══════════════════════════════════════════════════════════════════════════ */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, className: `lp-reveal ${visible ? "visible" : ""}` };
}
function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, className: revealClass } = useReveal();
  return <div ref={ref} className={`${revealClass} ${className}`}>{children}</div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activePanel, setActivePanel] = useState("chat");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ActivePanel = panelMap[activePanel];

  return (
    <>
      {/* Inline styles — exactly matching the provided HTML reference */}
      <style jsx global>{`
        /* ===== Landing Page Reset ===== */
        .lp-root {
          --accent:#EF6237;
          --accent-dark:#C8501F;
          --accent-light:#FF9B7A;
          --accent-tint:#FDEEE8;
          --accent-tint-strong:#FBDDD0;
          --lp-surface:#FFFFFF;
          --surface-alt:#FAF7F2;
          --ink:#221E1A;
          --ink-soft:#8C857D;
          --ink-faint:#C9C2BA;
          --lp-border:#ECE4DC;
          --container:1160px;
          --radius-sm:10px;
          --radius-md:16px;
          --radius-lg:24px;
          --radius-full:999px;
          --shadow-sm:0 1px 2px rgba(34,30,26,.04), 0 2px 6px rgba(34,30,26,.05);
          --shadow-md:0 10px 30px -8px rgba(34,30,26,.12);
          --shadow-lg:0 30px 60px -20px rgba(239,98,55,.35);
          --nav-h:76px;
          font-family:'Inter',var(--font-plus-jakarta-sans),sans-serif;
          color:var(--ink);
          background:var(--lp-surface);
          -webkit-font-smoothing:antialiased;
          line-height:1.6;
        }
        .lp-root img,.lp-root svg{ display:block; }
        .lp-container{ max-width:var(--container); margin:0 auto; padding:0 32px; }

        /* ===== Animations ===== */
        @keyframes lpFadeUp{ from{ opacity:0; transform:translateY(18px); } to{ opacity:1; transform:translateY(0); } }
        .lp-reveal{ opacity:0; transform:translateY(24px); transition:opacity .6s ease, transform .6s ease; }
        .lp-reveal.visible{ opacity:1; transform:translateY(0); }

        /* ===== Nav ===== */
        .lp-nav{
          position:fixed; top:0; left:0; right:0; height:var(--nav-h);
          display:flex; align-items:center; z-index:1000;
          background:rgba(255,255,255,.7);
          backdrop-filter:blur(14px) saturate(160%);
          -webkit-backdrop-filter:blur(14px) saturate(160%);
          border-bottom:1px solid transparent;
          transition:border-color .3s, background .3s;
        }
        .lp-nav.scrolled{ border-bottom-color:var(--lp-border); background:rgba(255,255,255,.92); }
        .lp-nav .lp-container{ display:flex; align-items:center; justify-content:space-between; width:100%; }
        .lp-brand{ display:flex; align-items:center; gap:10px; font-family:'Sora',var(--font-sora),sans-serif; font-weight:700; font-size:20px; color:var(--ink); text-decoration:none; }
        .lp-mark{
          width:32px; height:32px; border-radius:10px;
          background:linear-gradient(135deg,var(--accent),var(--accent-light));
          display:flex; align-items:center; justify-content:center;
          box-shadow:var(--shadow-sm); color:#fff;
        }
        .lp-nav-links{ display:flex; gap:36px; }
        .lp-nav-links a{ color:var(--ink-soft); text-decoration:none; font-size:14px; font-weight:500; transition:color .2s; }
        .lp-nav-links a:hover{ color:var(--ink); }

        /* ===== Buttons ===== */
        .lp-btn{
          display:inline-flex; align-items:center; justify-content:center; gap:8px;
          font-family:'Inter',var(--font-plus-jakarta-sans),sans-serif; font-weight:600; font-size:14px;
          border-radius:var(--radius-full); cursor:pointer; text-decoration:none;
          border:none; transition:all .2s ease; white-space:nowrap;
        }
        .lp-btn-primary{ background:var(--accent); color:#fff; padding:12px 24px; box-shadow:0 8px 20px -6px rgba(239,98,55,.5); }
        .lp-btn-primary:hover{ background:var(--accent-dark); transform:translateY(-1px); box-shadow:0 12px 24px -6px rgba(239,98,55,.6); }
        .lp-btn-secondary{ background:transparent; color:var(--ink); padding:12px 24px; border:1.5px solid var(--lp-border); }
        .lp-btn-secondary:hover{ border-color:var(--ink); background:var(--surface-alt); }
        .lp-btn-lg{ padding:16px 36px; font-size:16px; }
        .lp-btn-light{ background:#fff; color:var(--accent-dark); padding:16px 36px; font-size:16px; box-shadow:0 14px 32px -10px rgba(0,0,0,.35); }
        .lp-btn-light:hover{ transform:translateY(-1px); box-shadow:0 18px 38px -10px rgba(0,0,0,.4); }

        /* ===== Hero ===== */
        .lp-hero{
          position:relative; overflow:hidden;
          padding:calc(var(--nav-h) + 88px) 32px 0;
          background-color:var(--lp-surface);
          background-image:radial-gradient(circle, rgba(34,30,26,.035) 1px, transparent 1px);
          background-size:26px 26px;
        }
        .lp-hero::before{
          content:''; position:absolute; top:-220px; right:-220px;
          width:620px; height:620px; border-radius:50%;
          background:radial-gradient(circle, var(--accent-tint) 0%, transparent 70%);
          filter:blur(30px); pointer-events:none;
        }
        .lp-hero-inner{ max-width:760px; margin:0 auto; text-align:center; position:relative; z-index:1; }
        .lp-hero-inner > *{ opacity:0; animation:lpFadeUp .7s ease forwards; }
        .lp-hero-inner > *:nth-child(1){ animation-delay:.05s; }
        .lp-hero-inner > *:nth-child(2){ animation-delay:.15s; }
        .lp-hero-inner > *:nth-child(3){ animation-delay:.25s; }
        .lp-hero-inner > *:nth-child(4){ animation-delay:.35s; }

        .lp-eyebrow{
          display:inline-flex; align-items:center; gap:8px; padding:8px 16px;
          border-radius:var(--radius-full); background:var(--accent-tint); color:var(--accent-dark);
          font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:12px; font-weight:600; letter-spacing:.06em;
          text-transform:uppercase; margin-bottom:24px;
        }
        .lp-hero h1{
          font-family:'Sora',var(--font-sora),sans-serif; font-weight:800; font-size:clamp(40px,7vw,80px);
          line-height:1.08; letter-spacing:-.02em; color:var(--ink); margin-bottom:24px;
        }
        .lp-hero .lp-lead{ font-size:clamp(16px,2vw,19px); color:var(--ink-soft); max-width:600px; margin:0 auto 36px; }
        .lp-hero-ctas{ display:flex; gap:16px; justify-content:center; margin-bottom:88px; flex-wrap:wrap; }

        /* ===== Preview Card ===== */
        .lp-preview-wrap{
          position:relative; max-width:920px; margin:0 auto; padding-bottom:80px;
          opacity:0; animation:lpFadeUp .8s ease forwards; animation-delay:.45s;
        }
        .lp-preview-card{ background:var(--surface-alt); border:1px solid var(--lp-border); border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); overflow:hidden; }
        .lp-preview-bar{ display:flex; align-items:center; gap:16px; padding:14px 20px; border-bottom:1px solid var(--lp-border); background:#fff; }
        .lp-preview-dots{ display:flex; gap:8px; }
        .lp-preview-dots span{ width:10px; height:10px; border-radius:50%; display:block; }
        .lp-preview-dots span:nth-child(1){ background:var(--accent); }
        .lp-preview-dots span:nth-child(2){ background:var(--accent-light); }
        .lp-preview-dots span:nth-child(3){ background:var(--lp-border); }
        .lp-preview-url{ flex:1; text-align:center; font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:12px; color:var(--ink-faint); }
        .lp-preview-body{ padding:32px; text-align:left; }
        .lp-preview-greeting h2{ font-family:'Sora',var(--font-sora),sans-serif; font-size:22px; font-weight:700; margin-bottom:4px; }
        .lp-preview-greeting p{ color:var(--ink-soft); font-size:13px; margin-bottom:24px; }
        .lp-preview-grid{ display:grid; grid-template-columns:1.4fr 1fr; gap:20px; }
        .lp-preview-panel{ background:#fff; border:1px solid var(--lp-border); border-radius:var(--radius-md); padding:18px; }
        .lp-preview-panel .lp-label{ font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-soft); margin-bottom:14px; }
        .lp-class-row{ display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:var(--radius-sm); }
        .lp-class-row + .lp-class-row{ margin-top:4px; }
        .lp-class-row.active{ background:var(--accent-tint); }
        .lp-time{ font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:12px; color:var(--ink-soft); width:48px; }
        .lp-dot{ width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; display:block; }
        .lp-name{ font-size:14px; font-weight:500; }
        .lp-burnout-card{ display:flex; flex-direction:column; align-items:center; text-align:center; }
        .lp-burnout-card .lp-ring{ margin:4px 0 10px; }
        .lp-burnout-card .lp-sub{ font-size:12px; color:var(--ink-soft); }
        .lp-spend-row{ display:flex; align-items:center; justify-content:space-between; margin-top:20px; padding-top:20px; border-top:1px solid var(--lp-border); }
        .lp-spend-row .lp-amount{ font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:20px; font-weight:600; }
        .lp-spend-row .lp-slabel{ font-size:13px; color:var(--ink-soft); }
        .lp-spend-row a{ color:var(--accent-dark); font-size:13px; font-weight:600; text-decoration:none; }

        .lp-float-chip{
          position:absolute; display:flex; align-items:center; gap:8px; background:#fff;
          border:1px solid var(--lp-border); border-radius:var(--radius-full); padding:10px 16px;
          box-shadow:var(--shadow-md); font-size:13px; font-weight:500; color:var(--ink);
          opacity:0; animation:lpFadeUp .6s ease forwards;
        }
        .lp-float-chip svg{ color:var(--accent); width:16px; height:16px; flex-shrink:0; }
        .lp-chip-1{ top:-22px; right:36px; transform:rotate(-4deg); animation-delay:1.05s; }
        .lp-chip-2{ bottom:18px; left:-22px; transform:rotate(3deg); animation-delay:1.2s; }

        /* ===== Section layout ===== */
        .lp-section{ padding:96px 32px; }
        .lp-section-alt{ background:var(--surface-alt); }
        .lp-section-header{ text-align:center; max-width:640px; margin:0 auto 64px; }
        .lp-section-header .lp-tag{ font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:var(--accent-dark); font-weight:600; margin-bottom:16px; display:block; }
        .lp-section-header h2{ font-family:'Sora',var(--font-sora),sans-serif; font-weight:800; font-size:clamp(28px,4vw,44px); margin-bottom:16px; letter-spacing:-.01em; }
        .lp-section-header p{ color:var(--ink-soft); font-size:17px; }

        /* ===== Feature grid ===== */
        .lp-feature-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:24px; max-width:var(--container); margin:0 auto; }
        .lp-feature-card{ background:var(--lp-surface); border:1px solid var(--lp-border); border-radius:var(--radius-lg); padding:32px; transition:transform .25s, box-shadow .25s; }
        .lp-feature-card:hover{ transform:translateY(-4px); box-shadow:var(--shadow-md); }
        .lp-feature-icon{ width:48px; height:48px; border-radius:var(--radius-md); background:var(--accent-tint); display:flex; align-items:center; justify-content:center; color:var(--accent-dark); margin-bottom:20px; }
        .lp-feature-card h3{ font-family:'Sora',var(--font-sora),sans-serif; font-size:19px; font-weight:700; margin-bottom:10px; }
        .lp-feature-card p{ color:var(--ink-soft); font-size:15px; }

        /* ===== Showcase ===== */
        .lp-showcase-grid{ display:grid; grid-template-columns:1fr 1.2fr; gap:64px; max-width:var(--container); margin:0 auto; align-items:start; }
        .lp-showcase-list{ display:flex; flex-direction:column; gap:8px; }
        .lp-showcase-item{ display:flex; gap:16px; padding:18px; border-radius:var(--radius-md); border:1px solid transparent; cursor:pointer; transition:all .2s; }
        .lp-showcase-item:hover{ background:var(--surface-alt); }
        .lp-showcase-item.active{ background:var(--accent-tint); border-color:var(--accent-tint-strong); }
        .lp-showcase-item .lp-sicon{ width:40px; height:40px; border-radius:var(--radius-sm); background:#fff; border:1px solid var(--lp-border); display:flex; align-items:center; justify-content:center; color:var(--ink-soft); flex-shrink:0; transition:color .2s, border-color .2s; }
        .lp-showcase-item.active .lp-sicon{ color:var(--accent-dark); border-color:var(--accent-tint-strong); }
        .lp-showcase-item h4{ font-family:'Sora',var(--font-sora),sans-serif; font-size:16px; font-weight:700; margin-bottom:4px; }
        .lp-showcase-item.active h4{ color:var(--accent-dark); }
        .lp-showcase-item p{ font-size:14px; color:var(--ink-soft); }

        .lp-showcase-panel-wrap{ position:sticky; top:calc(var(--nav-h) + 24px); min-height:420px; background:var(--surface-alt); border:1px solid var(--lp-border); border-radius:var(--radius-lg); box-shadow:var(--shadow-md); overflow:hidden; padding:32px; }
        .lp-panel-title{ display:flex; align-items:center; gap:10px; font-family:'Sora',var(--font-sora),sans-serif; font-weight:700; font-size:16px; margin-bottom:24px; color:var(--ink); }
        .lp-panel-title svg{ color:var(--accent-dark); }

        .lp-chat-bubble{ background:#fff; border:1px solid var(--lp-border); border-radius:var(--radius-md); padding:16px; font-size:14px; line-height:1.6; margin-bottom:20px; }
        .lp-veg{ color:#3D8B5F; font-weight:700; }
        .lp-input-bar{ display:flex; align-items:center; gap:12px; background:#fff; border:1px solid var(--lp-border); border-radius:var(--radius-full); padding:8px 8px 8px 18px; }
        .lp-input-bar span{ flex:1; color:var(--ink-faint); font-size:14px; }
        .lp-mic,.lp-send{ width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .lp-mic{ color:var(--ink-soft); }
        .lp-send{ background:var(--accent); color:#fff; }

        .lp-notice-card{ background:#fff; border:1px solid var(--lp-border); border-radius:var(--radius-md); padding:20px; }
        .lp-notice-meta{ display:flex; align-items:center; gap:10px; margin-bottom:12px; }
        .lp-tag-pill{ background:var(--accent-tint); color:var(--accent-dark); padding:4px 10px; border-radius:var(--radius-full); font-weight:600; font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:11px; text-transform:uppercase; }
        .lp-when{ font-size:12px; color:var(--ink-soft); }
        .lp-notice-card h5{ font-family:'Sora',var(--font-sora),sans-serif; font-size:15px; font-weight:700; margin-bottom:16px; }
        .lp-ai-action{ display:flex; gap:10px; align-items:flex-start; font-size:13px; color:var(--ink-soft); border-top:1px solid var(--lp-border); padding-top:14px; }
        .lp-ai-action svg{ color:var(--accent-dark); flex-shrink:0; margin-top:2px; }

        .lp-menu-row,.lp-deadline-row,.lp-eco-row{ display:flex; align-items:center; gap:14px; padding:14px 0; border-bottom:1px solid var(--lp-border); font-size:14px; }
        .lp-menu-row:last-child,.lp-deadline-row:last-child,.lp-eco-row:last-child{ border-bottom:none; }
        .lp-meal{ width:88px; color:var(--ink-soft); font-size:11px; text-transform:uppercase; font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; letter-spacing:.04em; }
        .lp-veg-dot{ width:8px; height:8px; border-radius:50%; flex-shrink:0; display:block; }
        .lp-veg-dot.green{ background:#3D8B5F; }
        .lp-veg-dot.red{ background:#D14848; }
        .lp-dl-icon{ color:var(--accent-dark); flex-shrink:0; }
        .lp-due{ margin-left:auto; font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:12px; color:var(--accent-dark); background:var(--accent-tint); padding:4px 10px; border-radius:var(--radius-full); white-space:nowrap; }
        .lp-eco-icon{ width:36px; height:36px; border-radius:var(--radius-sm); background:var(--accent-tint); color:var(--accent-dark); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .lp-eco-meta{ font-size:12px; color:var(--ink-soft); margin-top:2px; }

        /* ===== PocketBuddy ===== */
        .lp-section-tint{ background:linear-gradient(180deg, var(--accent-tint) 0%, #FFF8F4 100%); }
        .lp-pb-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:24px; max-width:var(--container); margin:0 auto 56px; }
        .lp-pb-card{ background:#fff; border:1px solid var(--lp-border); border-radius:var(--radius-lg); padding:32px; box-shadow:var(--shadow-sm); transition:transform .25s, box-shadow .25s; }
        .lp-pb-card:hover{ transform:translateY(-4px); box-shadow:var(--shadow-md); }
        .lp-pb-card .lp-visual{ margin-bottom:24px; height:56px; display:flex; align-items:center; }
        .lp-pb-card h3{ font-family:'Sora',var(--font-sora),sans-serif; font-size:18px; font-weight:700; margin-bottom:10px; }
        .lp-pb-card p{ color:var(--ink-soft); font-size:14px; }
        .lp-pb-stats{ display:flex; justify-content:center; gap:64px; flex-wrap:wrap; max-width:var(--container); margin:0 auto; padding-top:48px; border-top:1px solid rgba(239,98,55,.15); }
        .lp-pb-stat{ text-align:center; }
        .lp-pb-stat .lp-value{ font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:28px; font-weight:600; color:var(--accent-dark); }
        .lp-pb-stat .lp-statlabel{ font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:12px; color:var(--ink-soft); text-transform:uppercase; letter-spacing:.05em; margin-top:6px; }

        /* ===== How it works ===== */
        .lp-steps{ display:grid; grid-template-columns:repeat(3,1fr); gap:24px; max-width:var(--container); margin:0 auto 56px; position:relative; }
        .lp-steps::before{ content:''; position:absolute; top:38px; left:12%; right:12%; border-top:2px dashed var(--accent-tint-strong); z-index:0; }
        .lp-step-card{ background:var(--surface-alt); border:1px solid var(--lp-border); border-radius:var(--radius-lg); padding:32px; position:relative; z-index:1; }
        .lp-step-icon{ width:44px; height:44px; border-radius:50%; background:var(--accent-tint); color:var(--accent-dark); display:flex; align-items:center; justify-content:center; margin-bottom:20px; }
        .lp-step-num{ font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:12px; color:var(--accent-dark); letter-spacing:.08em; margin-bottom:12px; display:block; }
        .lp-step-card h3{ font-family:'Sora',var(--font-sora),sans-serif; font-size:18px; font-weight:700; margin-bottom:10px; }
        .lp-step-card p{ color:var(--ink-soft); font-size:14px; }

        .lp-summary-card{ max-width:760px; margin:0 auto; background:#fff; border:1px solid var(--lp-border); border-radius:var(--radius-lg); box-shadow:var(--shadow-md); padding:28px 32px; display:flex; align-items:center; gap:20px; }
        .lp-summary-card .lp-badge{ width:44px; height:44px; border-radius:var(--radius-md); background:linear-gradient(135deg,var(--accent),var(--accent-light)); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#fff; }
        .lp-summary-card .lp-text strong{ font-family:'Sora',var(--font-sora),sans-serif; font-size:16px; display:block; margin-bottom:4px; font-weight:700; }
        .lp-summary-card .lp-text span{ font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:12px; color:var(--ink-soft); }

        /* ===== CTA ===== */
        .lp-cta-section{
          background:linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
          padding:96px 32px; text-align:center; position:relative; overflow:hidden; color:#fff;
        }
        .lp-cta-section::before{
          content:''; position:absolute; inset:0;
          background-image:radial-gradient(circle at 18% 20%, rgba(255,255,255,.14) 0, transparent 40%),
                            radial-gradient(circle at 82% 78%, rgba(255,255,255,.10) 0, transparent 40%);
        }
        .lp-cta-inner{ position:relative; z-index:1; max-width:640px; margin:0 auto; }
        .lp-cta-inner h2{ font-family:'Sora',var(--font-sora),sans-serif; font-weight:800; font-size:clamp(32px,5vw,56px); margin-bottom:16px; letter-spacing:-.01em; }
        .lp-cta-inner p{ font-size:17px; color:rgba(255,255,255,.85); margin-bottom:36px; }
        .lp-cta-inner .lp-note{ font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:12px; color:rgba(255,255,255,.7); margin-top:18px; }

        /* ===== Footer ===== */
        .lp-footer{ background:var(--ink); color:var(--surface-alt); padding:64px 32px 32px; }
        .lp-footer-grid{ display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr; gap:48px; max-width:var(--container); margin:0 auto; }
        .lp-footer-brand .lp-brand{ color:#fff; margin-bottom:14px; }
        .lp-footer-brand p{ color:rgba(245,241,235,.6); font-size:14px; max-width:240px; }
        .lp-footer-col h5{ font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:rgba(245,241,235,.5); margin-bottom:18px; }
        .lp-footer-col a{ display:block; color:rgba(245,241,235,.85); text-decoration:none; font-size:14px; margin-bottom:12px; transition:color .2s; }
        .lp-footer-col a:hover{ color:var(--accent-light); }
        .lp-footer-bottom{ max-width:var(--container); margin:48px auto 0; padding-top:24px; border-top:1px solid rgba(245,241,235,.1); font-family:'IBM Plex Mono',var(--font-ibm-plex-mono),monospace; font-size:12px; color:rgba(245,241,235,.5); text-align:center; }

        /* ===== Responsive ===== */
        @media (max-width:900px){
          .lp-feature-grid,.lp-pb-grid,.lp-steps{ grid-template-columns:1fr; }
          .lp-showcase-grid{ grid-template-columns:1fr; gap:40px; }
          .lp-showcase-panel-wrap{ position:relative; top:0; min-height:380px; }
          .lp-pb-stats{ flex-direction:column; gap:24px; }
          .lp-steps::before{ display:none; }
          .lp-footer-grid{ grid-template-columns:1fr 1fr; gap:32px; }
        }
        @media (max-width:760px){
          .lp-nav-links{ display:none; }
          .lp-hero-ctas{ flex-direction:column; align-items:center; }
          .lp-preview-grid{ grid-template-columns:1fr; }
          .lp-float-chip{ display:none; }
          .lp-summary-card{ flex-direction:column; text-align:center; }
        }
      `}</style>

      <div className="lp-root">

        {/* =================== NAV =================== */}
        <nav className={`lp-nav ${scrolled ? "scrolled" : ""}`}>
          <div className="lp-container">
            <Link href="/" className="lp-brand">
              <span className="lp-mark"><SparkleIcon size={16} /></span>
              CampusFlow
            </Link>
            <div className="lp-nav-links">
              <a href="#product">Product</a>
              <a href="#pocketbuddy">PocketBuddy</a>
              <a href="#how-it-works">How it works</a>
            </div>
            <Link href="/dashboard" className="lp-btn lp-btn-primary">Get Started</Link>
          </div>
        </nav>

        {/* =================== HERO =================== */}
        <header className="lp-hero">
          <div className="lp-hero-inner">
            <div className="lp-eyebrow"><SparkleIcon size={14} /> The Ultimate AI Student Assistant</div>
            <h1>Your Campus Life,<br />Managed by AI.</h1>
            <p className="lp-lead">Unify your class schedules, messy deadlines, and chaotic notices into one perfectly organized, beautifully intelligent platform.</p>
            <div className="lp-hero-ctas">
              <Link href="/dashboard" className="lp-btn lp-btn-primary lp-btn-lg">Get started for free</Link>
              <a href="#how-it-works" className="lp-btn lp-btn-secondary lp-btn-lg">See how it works</a>
            </div>
          </div>

          {/* Preview card */}
          <div className="lp-preview-wrap">
            <div className="lp-preview-card">
              <div className="lp-preview-bar">
                <div className="lp-preview-dots"><span /><span /><span /></div>
                <div className="lp-preview-url">campusflow.app/dashboard</div>
              </div>
              <div className="lp-preview-body">
                <div className="lp-preview-greeting">
                  <h2>Good morning, Rohit 👋</h2>
                  <p>Here&apos;s your campus overview for today.</p>
                </div>
                <div className="lp-preview-grid">
                  <div className="lp-preview-panel">
                    <div className="lp-label">Classes Today</div>
                    {[
                      { time: "09:00", name: "OR", active: false },
                      { time: "10:00", name: "DBMS", active: false },
                      { time: "11:00", name: "Real Analysis", active: true },
                      { time: "12:00", name: "OS", active: false },
                    ].map((c) => (
                      <div key={c.time} className={`lp-class-row ${c.active ? "active" : ""}`}>
                        <span className="lp-time">{c.time}</span><span className="lp-dot" /><span className="lp-name">{c.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="lp-preview-panel lp-burnout-card">
                    <div className="lp-label">Burnout Risk</div>
                    <div className="lp-ring">
                      <svg width="84" height="84" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#ECE4DC" strokeWidth="8" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#EF6237" strokeWidth="8" strokeLinecap="round" strokeDasharray="264" strokeDashoffset="246" transform="rotate(-90 50 50)" />
                        <text x="50" y="56" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="18" fontWeight="600" fill="#221E1A">6.9%</text>
                      </svg>
                    </div>
                    <div className="lp-sub">Low risk this week</div>
                  </div>
                </div>
                <div className="lp-spend-row">
                  <div>
                    <span className="lp-amount">₹0</span>
                    <span className="lp-slabel"> spent this month</span>
                  </div>
                  <a href="#">Log expense →</a>
                </div>
              </div>
            </div>
            <div className="lp-float-chip lp-chip-1"><BellIcon size={16} /> 2 new notices</div>
            <div className="lp-float-chip lp-chip-2"><SparkleIcon size={16} /> AI Daily Briefing ready</div>
          </div>
        </header>

        {/* =================== FEATURE GRID =================== */}
        <section className="lp-section">
          <Reveal className="lp-section-header">
            <h2>Built for how students actually live.</h2>
            <p>Three engines under the hood, all talking to each other.</p>
          </Reveal>
          <div className="lp-feature-grid">
            {[
              { icon: <ChatIcon size={22} />, title: "RAG AI Chatbot", desc: "Ask anything about your campus. We use vector embeddings to instantly fetch the exact notice or deadline you need." },
              { icon: <ClockIcon size={22} />, title: "AI Study Planner", desc: "Upload your timetable. Our AI will map your free time against your deadlines to craft the perfect weekly study schedule." },
              { icon: <ShieldIcon size={22} />, title: "Deadline Brain", desc: "Stop missing assignments. Our chronological engine automatically prioritizes what's due tomorrow vs what's due next week." },
            ].map((c) => (
              <Reveal key={c.title} className="lp-feature-card">
                <div className="lp-feature-icon">{c.icon}</div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* =================== CAMPUSFLOW SHOWCASE =================== */}
        <section className="lp-section lp-section-alt" id="product">
          <Reveal className="lp-section-header">
            <span className="lp-tag">CampusFlow</span>
            <h2>Everything about your campus, handled.</h2>
            <p>AI Chat, notices, mess menu, deadlines, schedule, and your campus community — all in one place.</p>
          </Reveal>
          <Reveal className="lp-showcase-grid">
            <div className="lp-showcase-list">
              {showcaseItems.map((item) => (
                <div
                  key={item.key}
                  className={`lp-showcase-item ${activePanel === item.key ? "active" : ""}`}
                  onClick={() => setActivePanel(item.key)}
                >
                  <div className="lp-sicon">{item.icon}</div>
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="lp-showcase-panel-wrap" key={activePanel}>
              <ActivePanel />
            </div>
          </Reveal>
        </section>

        {/* =================== POCKETBUDDY =================== */}
        <section className="lp-section lp-section-tint" id="pocketbuddy">
          <Reveal className="lp-section-header">
            <span className="lp-tag">PocketBuddy</span>
            <h2>Your money and your mind, finally in sync.</h2>
            <p>Most apps handle finance or wellness — never both, never for student life specifically. PocketBuddy tracks your spending, flags burnout before it hits, and nudges you toward better days.</p>
          </Reveal>
          <Reveal className="lp-pb-grid">
            <div className="lp-pb-card">
              <div className="lp-visual">
                <svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="#ECE4DC" strokeWidth="6" /><circle cx="28" cy="28" r="24" fill="none" stroke="#EF6237" strokeWidth="6" strokeLinecap="round" strokeDasharray="151" strokeDashoffset="48" transform="rotate(-90 28 28)" /><text x="28" y="33" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="13" fontWeight="600" fill="#221E1A">68%</text></svg>
              </div>
              <h3>Log expenses in seconds</h3>
              <p>Manual entry or scan a receipt — PocketBuddy auto-categorizes everything from food to rent.</p>
            </div>
            <div className="lp-pb-card">
              <div className="lp-visual">
                <svg width="64" height="44" viewBox="0 0 64 44"><rect x="2" y="24" width="11" height="18" rx="2" fill="#ECE4DC" /><rect x="18" y="10" width="11" height="32" rx="2" fill="#EF6237" /><rect x="34" y="18" width="11" height="24" rx="2" fill="#ECE4DC" /><rect x="50" y="4" width="11" height="38" rx="2" fill="#FF9B7A" /></svg>
              </div>
              <h3>Budgets that actually fit student life</h3>
              <p>Set monthly limits per category and see live allocation against what you&apos;ve actually spent.</p>
            </div>
            <div className="lp-pb-card">
              <div className="lp-visual">
                <svg width="72" height="44" viewBox="0 0 72 44"><path d="M2 34 L14 30 L26 32 L38 20 L50 24 L70 6" fill="none" stroke="#EF6237" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="70" cy="6" r="4.5" fill="#EF6237" /></svg>
              </div>
              <h3>Catch burnout before it catches you</h3>
              <p>Daily mood and sleep check-ins feed a burnout score and 14-day trend, with AI nudges when your routine looks unsustainable.</p>
            </div>
          </Reveal>
          <Reveal className="">
            <div className="lp-pb-stats">
              <div className="lp-pb-stat"><div className="lp-value">₹0</div><div className="lp-statlabel">tracked automatically</div></div>
              <div className="lp-pb-stat"><div className="lp-value">60/100</div><div className="lp-statlabel">burnout score, explained</div></div>
              <div className="lp-pb-stat"><div className="lp-value">14 days</div><div className="lp-statlabel">trend, not guesswork</div></div>
            </div>
          </Reveal>
        </section>

        {/* =================== HOW IT WORKS =================== */}
        <section className="lp-section" id="how-it-works">
          <Reveal className="lp-section-header">
            <span className="lp-tag">One Assistant</span>
            <h2>Two halves. One brain.</h2>
            <p>CampusFlow and PocketBuddy aren&apos;t separate apps with separate logins — they&apos;re one assistant that understands your schedule AND your spending AND your stress levels, together.</p>
          </Reveal>
          <Reveal className="lp-steps">
            <div className="lp-step-card">
              <div className="lp-step-icon"><BellIcon size={20} /></div>
              <span className="lp-step-num">STEP 01</span>
              <h3>Your day comes in</h3>
              <p>Classes, notices, deadlines, and mess menus flow in automatically.</p>
            </div>
            <div className="lp-step-card">
              <div className="lp-step-icon"><SparkleIcon size={20} /></div>
              <span className="lp-step-num">STEP 02</span>
              <h3>AI makes sense of it</h3>
              <p>One assistant cross-references your schedule, spending, and wellbeing.</p>
            </div>
            <div className="lp-step-card">
              <div className="lp-step-icon"><HeartIcon size={20} /></div>
              <span className="lp-step-num">STEP 03</span>
              <h3>You get nudged, not nagged</h3>
              <p>A quick budget tip here, a burnout warning there — exactly when it&apos;s useful.</p>
            </div>
          </Reveal>
          <Reveal className="lp-summary-card">
            <div className="lp-badge"><SparkleIcon size={20} /></div>
            <div className="lp-text">
              <strong>Good morning, Rohit — here&apos;s today, your spending, and how you&apos;re doing.</strong>
              <span>DAILY BRIEFING · PROACTIVE CHECK-IN</span>
            </div>
          </Reveal>
        </section>

        {/* =================== FINAL CTA =================== */}
        <section className="lp-cta-section">
          <div className="lp-cta-inner">
            <h2>Stop juggling fifteen apps.</h2>
            <p>CampusFlow and PocketBuddy, together, free to start.</p>
            <Link href="/dashboard" className="lp-btn lp-btn-light">Get Started Free</Link>
            <div className="lp-note">No credit card needed.</div>
          </div>
        </section>

        {/* =================== FOOTER =================== */}
        <footer className="lp-footer">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <Link href="/" className="lp-brand"><span className="lp-mark"><SparkleIcon size={16} /></span> CampusFlow</Link>
              <p>AI operating system for student life.</p>
            </div>
            <div className="lp-footer-col">
              <h5>Product</h5>
              <a href="#">AI Chat</a><a href="#">Notices</a><a href="#">Mess Menu</a><a href="#">Deadlines</a><a href="#">Schedule</a>
            </div>
            <div className="lp-footer-col">
              <h5>PocketBuddy</h5>
              <a href="#">Expenses</a><a href="#">Budget</a><a href="#">Wellness</a>
            </div>
            <div className="lp-footer-col">
              <h5>Company</h5>
              <a href="#">About</a><a href="#">Contact</a><a href="#">Privacy</a>
            </div>
          </div>
          <div className="lp-footer-bottom">© 2026 CampusFlow. Built for the Amazon AWS Track 48-Hour Hackathon.</div>
        </footer>
      </div>
    </>
  );
}
