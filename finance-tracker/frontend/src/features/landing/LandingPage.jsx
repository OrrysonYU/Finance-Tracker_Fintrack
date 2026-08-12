import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleDollarSign,
  LockKeyhole,
  Menu,
  PiggyBank,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { FintrackLogo } from "../../components/brand";
import "./landing.css";

const features = [
  { id: "accounts", icon: Wallet, label: "Accounts", title: "One view of your financial life.", body: "Keep balances and account context together, so you can make decisions from the full picture—not a handful of disconnected tabs." },
  { id: "transactions", icon: Search, label: "Transactions", title: "Activity you can actually read.", body: "Search, filter, and understand the movements behind your numbers. Fintrack keeps your everyday financial activity organized and clear." },
  { id: "budgets", icon: PiggyBank, label: "Budgets", title: "Plan with context, not guilt.", body: "Set spending plans, watch utilization, and spot pressure early while there is still time to adjust." },
  { id: "goals", icon: Target, label: "Goals", title: "Turn intentions into momentum.", body: "Make savings progress visible with milestones that connect today's choices to what you are building next." },
  { id: "reports", icon: BarChart3, label: "Reports", title: "See the story in your data.", body: "Explore trends, category patterns, and summaries that make a month of transactions easier to reason about." },
];

function ProductPreview() {
  return (
    <div className="landing-preview" aria-label="Illustration of the Fintrack dashboard" role="img">
      <div className="landing-preview__chrome"><span /><span /><span /><small>fintrack / overview</small><b>•••</b></div>
      <div className="landing-preview__body">
        <aside><div className="landing-preview__mini-brand"><FintrackLogo size={18} decorative /></div><i /><i /><i /><i /><i /></aside>
        <div className="landing-preview__content">
          <div className="landing-preview__topline"><div><small>Financial command center</small><strong className="landing-preview__title">Your overview</strong></div><span className="landing-preview__date">This month⌄</span></div>
          <div className="landing-preview__kpis"><div><small>Total balance</small><strong>$24,680.40</strong><em>↑ 8.4%</em></div><div><small>Monthly income</small><strong>$6,420.00</strong><em>On track</em></div><div><small>Net cash flow</small><strong>+$1,284.30</strong><em>Healthy</em></div></div>
          <div className="landing-preview__grid"><div className="landing-preview__chart"><div className="landing-preview__card-heading"><b>Cash flow</b><small>Last 6 months</small></div><svg viewBox="0 0 430 150" preserveAspectRatio="none" aria-hidden="true"><path d="M4 125 C 35 115, 47 120, 72 96 S 112 104, 137 80 S 180 88, 205 63 S 245 73, 270 45 S 310 57, 335 38 S 380 43, 426 12" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M4 125 C 35 115, 47 120, 72 96 S 112 104, 137 80 S 180 88, 205 63 S 245 73, 270 45 S 310 57, 335 38 S 380 43, 426 12 V150 H4Z" fill="currentColor" opacity=".08" /></svg><div className="landing-preview__axis"><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div></div><div className="landing-preview__insight"><div className="landing-preview__card-heading"><b><Sparkles size={14} /> AI insight</b><small>Read-only</small></div><p>Dining spend is 12% lower than your three-month average.</p><span className="landing-preview__link">View reasoning <ArrowUpRight size={13} /></span></div></div>
          <div className="landing-preview__bottom"><div><small>Budget utilization</small><b>68%</b><span><i style={{ width: "68%" }} /></span></div><div><small>Savings goal</small><b>74%</b><span><i style={{ width: "74%" }} /></span></div><div><small>Recent activity</small><p><strong>Grocery store</strong><span>− $86.40</span></p><p><strong>Salary deposit</strong><span className="positive">+ $3,210</span></p></div></div>
        </div>
      </div>
    </div>
  );
}

function SectionIntro({ eyebrow, title, body, align = "left" }) {
  return <div className={`landing-section-intro landing-section-intro--${align}`}><span>{eyebrow}</span><h2>{title}</h2><p>{body}</p></div>;
}

function FeatureSection({ feature, index }) {
  const Icon = feature.icon;
  const reverse = index % 2 === 1;
  const reduceMotion = useReducedMotion();
  return <motion.section id={feature.id} className={`landing-feature ${reverse ? "landing-feature--reverse" : ""}`} initial={reduceMotion ? false : { opacity: 0, y: 28 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .55 }}><div className="landing-feature__copy"><div className="landing-icon"><Icon size={20} /></div><span className="landing-feature__eyebrow">{feature.label}</span><h3>{feature.title}</h3><p>{feature.body}</p><a href="#preview">See it in the workspace <ArrowRight size={15} /></a></div><div className={`landing-feature__visual landing-feature__visual--${feature.id}`} aria-hidden="true"><div className="landing-feature__visual-header"><b>{feature.label}</b><span>•••</span></div>{feature.id === "accounts" && <><div className="landing-account-total"><small>Total across accounts</small><strong>$24,680.40</strong><em>+ $1,284 this month</em></div><div className="landing-account-row"><span className="landing-avatar">A</span><b>Everyday checking</b><strong>$8,420.18</strong></div><div className="landing-account-row"><span className="landing-avatar landing-avatar--soft">S</span><b>Rainy day savings</b><strong>$16,260.22</strong></div></>}{feature.id === "transactions" && <><div className="landing-search"><Search size={13} /> Search transactions <kbd>/</kbd></div><div className="landing-transaction"><span className="landing-dot landing-dot--blue" /><b>Grocery store</b><small>Today</small><strong>− $86.40</strong></div><div className="landing-transaction"><span className="landing-dot landing-dot--green" /><b>Salary deposit</b><small>Yesterday</small><strong className="positive">+ $3,210</strong></div><div className="landing-transaction"><span className="landing-dot landing-dot--amber" /><b>Cloud services</b><small>Jun 12</small><strong>− $24.00</strong></div></>}{feature.id === "budgets" && <><div className="landing-budget"><div><b>Essentials</b><span>$1,240 / $1,800</span></div><span><i style={{ width: "69%" }} /></span><small>69% used · 12 days left</small></div><div className="landing-budget"><div><b>Flexible spending</b><span>$580 / $700</span></div><span><i style={{ width: "83%" }} /></span><small>83% used · keep an eye on this</small></div></>}{feature.id === "goals" && <><div className="landing-goal"><div className="landing-goal__ring"><span>74%</span></div><div><b>Move to a new home</b><small>$7,400 of $10,000</small><em>On pace for Nov 2025</em></div></div><div className="landing-goal__milestones"><span /><span /><span /><span /><span /></div></>}{feature.id === "reports" && <><div className="landing-report-bars"><span style={{ height: "42%" }} /><span style={{ height: "68%" }} /><span style={{ height: "54%" }} /><span style={{ height: "82%" }} /><span style={{ height: "62%" }} /><span style={{ height: "92%" }} /></div><div className="landing-report-legend"><b>Monthly spend</b><span>Oct 2024 · $4,128</span></div></>}</div></motion.section>;
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const menuButtonRef = useRef(null);
  const closeMenu = () => setMenuOpen(false);
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);
  useEffect(() => {
    const closeAtDesktop = (event) => {
      if (event.matches) setMenuOpen(false);
    };
    const desktopQuery = window.matchMedia("(min-width: 721px)");
    desktopQuery.addEventListener("change", closeAtDesktop);
    return () => desktopQuery.removeEventListener("change", closeAtDesktop);
  }, []);
  useEffect(() => {
    const pageUrl = new URL("/", window.location.origin).href;
    const socialImageUrl = new URL("/icons/fintrack-512.png", window.location.origin).href;
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", pageUrl);
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", pageUrl);
    document.querySelector('meta[property="og:image"]')?.setAttribute("content", socialImageUrl);
    document.querySelector('meta[name="twitter:image"]')?.setAttribute("content", socialImageUrl);
  }, []);
  return <div className="landing-page">
    <a className="landing-skip" href="#main-content">Skip to content</a>
    <header className="landing-nav"><div className="landing-container landing-nav__inner"><Link to="/" className="landing-brand" aria-label="Fintrack home" onClick={closeMenu}><FintrackLogo size={30} decorative /><span>fintrack</span></Link><button ref={menuButtonRef} type="button" className="landing-menu" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-controls="landing-primary-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button><nav id="landing-primary-navigation" className={`landing-nav__links ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation"><a href="#product" onClick={closeMenu}>Product</a><a href="#intelligence" onClick={closeMenu}>Intelligence</a><a href="#trust" onClick={closeMenu}>Trust</a><Link to="/login" onClick={closeMenu}>Sign in</Link><Link className="landing-button landing-button--dark landing-button--nav" to="/register" onClick={closeMenu}>Create account <ArrowUpRight size={15} /></Link></nav></div></header>
    <main id="main-content" tabIndex="-1">
      <section className="landing-hero"><div className="landing-container landing-hero__grid"><div className="landing-hero__copy"><div className="landing-kicker"><span className="landing-kicker__dot" /> A clearer way to manage your money</div><h1>Financial clarity, <em>finally.</em></h1><p>Fintrack brings your accounts, activity, plans, goals, and intelligent insights into one calm workspace—so you can make your next money decision with confidence.</p><div className="landing-hero__actions"><Link className="landing-button landing-button--dark" to="/register">Create your account <ArrowRight size={16} /></Link><Link className="landing-button landing-button--light" to="/login">Sign in</Link></div><div className="landing-hero__note"><ShieldCheck size={15} /> Your data stays yours. Built for clarity, not noise.</div></div><motion.div className="landing-hero__preview" initial={reduceMotion ? false : { opacity: 0, y: 24, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .7, delay: .12 }}><div className="landing-hero__glow" /><ProductPreview /><div className="landing-float landing-float--one"><span>Net cash flow</span><b>+$1,284.30</b><em><ArrowUpRight size={12} /> 14.2%</em></div><div className="landing-float landing-float--two"><BrainCircuit size={15} /><span>Insight ready</span></div></motion.div></div><div className="landing-container landing-hero__proof"><span>Everything in one workspace</span><i /><span>Read-only, explainable intelligence</span><i /><span>Designed for everyday decisions</span></div></section>
      <section id="product" className="landing-story"><div className="landing-container"><SectionIntro eyebrow="The fragmented money problem" title="Your finances are connected. Your tools should be too." body="Balances live in one place. Transactions in another. Budgets in a spreadsheet. Goals in your head. Fintrack gives every part of your financial picture a shared context." align="center" /><div id="preview" className="landing-story__preview"><ProductPreview /></div></div></section>
      <section id="intelligence" className="landing-intelligence"><div className="landing-container landing-intelligence__grid"><div><span className="landing-overline"><BrainCircuit size={16} /> Financial intelligence</span><h2>Turn activity into understanding.</h2><p>Fintrack’s current AI Insights surface patterns, anomalies, forecasts, and practical next steps from your recorded activity. Every signal is labeled, explainable, and kept under your control.</p><div className="landing-check-list"><span><Check size={14} /> Grounded in your recorded data</span><span><Check size={14} /> Read-only by design</span><span><Check size={14} /> Recommendations you can review</span></div><a className="landing-text-link" href="#trust">How Fintrack earns trust <ArrowRight size={15} /></a><p className="landing-future-note"><Sparkles size={14} /> Looking ahead: a conversational AI Assistant is a future product concept. It is not available in Fintrack today.</p></div><div className="landing-intelligence__panel"><div className="landing-intelligence__panel-top"><span><Sparkles size={15} /> AI insight</span><small>Based on the last 90 days</small></div><h3>Your essentials budget is holding steady.</h3><p>Groceries are 8% below your recent average, while subscriptions have increased slightly. You have room to stay on pace this month.</p><div className="landing-intelligence__evidence"><span><CircleDollarSign size={14} /> 24 transactions reviewed</span><span><ArrowUpRight size={14} /> Confidence: clear</span></div><div className="landing-intelligence__panel-footer"><span>Rule-based insight</span><span className="landing-intelligence__review">Review activity <ChevronRight size={14} /></span></div></div></div></section>
      <section className="landing-features"><div className="landing-container"><SectionIntro eyebrow="The Fintrack workspace" title="A more useful view of everyday money." body="Each part of Fintrack is designed to work on its own—and become more valuable when the pieces share context." />{features.map((feature, index) => <FeatureSection key={feature.id} feature={feature} index={index} />)}</div></section>
      <section id="trust" className="landing-trust"><div className="landing-container landing-trust__grid"><div><span className="landing-overline"><LockKeyhole size={16} /> Trust, by design</span><h2>Quiet confidence in every detail.</h2><p>Fintrack is built around the principles that matter when the subject is your money: clear records, explicit control, and honest communication about what the system knows.</p></div><div className="landing-trust__cards"><article><ShieldCheck size={20} /><h3>Privacy-first foundations</h3><p>Your financial workspace is personal. Fintrack does not need exaggerated promises to respect that.</p></article><article><LockKeyhole size={20} /><h3>Control stays with you</h3><p>Insights are read-only. Review, correct, or ignore recommendations before you act.</p></article><article><Sparkles size={20} /><h3>AI with boundaries</h3><p>AI Insights are available today. A conversational AI Assistant is a future concept—not presented as live functionality.</p></article></div></div></section>
      <section className="landing-cta"><div className="landing-container landing-cta__inner"><div><span className="landing-overline">Your next decision, made clearer</span><h2>Build a better relationship with your money.</h2><p>Start with the records you already understand. Grow into the fuller picture at your own pace.</p></div><div className="landing-cta__actions"><Link className="landing-button landing-button--white" to="/register">Create your account <ArrowRight size={16} /></Link><Link className="landing-cta__signin" to="/login">Already have an account? Sign in <ArrowRight size={14} /></Link></div></div></section>
    </main>
    <footer className="landing-footer"><div className="landing-container landing-footer__top"><div><Link to="/" className="landing-brand" aria-label="Fintrack home"><FintrackLogo size={27} variant="inverse" decorative /><span>fintrack</span></Link><p>A calmer, clearer way to understand your finances.</p></div><div className="landing-footer__links"><div><b>Product</b><a href="#product">Overview</a><a href="#intelligence">AI Insights</a><a href="#accounts">Accounts</a><a href="#reports">Reports</a></div><div><b>Access</b><Link to="/login">Sign in</Link><Link to="/register">Create account</Link></div><div><b>Principles</b><a href="#trust">Security & privacy</a><a href="#intelligence">AI boundaries</a></div></div></div><div className="landing-container landing-footer__bottom"><span>© {new Date().getFullYear()} Fintrack</span><span>Made for clearer financial decisions.</span></div></footer>
  </div>;
}
