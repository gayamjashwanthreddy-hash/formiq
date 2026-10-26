"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import Logo, { FormIQMark } from "@/components/ui/logo";

export default function CinematicExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [loaderComplete, setLoaderComplete] = useState(false);
  const [activeNavScene, setActiveNavScene] = useState<"01" | "02" | "03" | "04">("01");
  const [navTheme, setNavTheme] = useState<"dark" | "paper" | "blue">("dark");

  const scrollToScene = (selector: string) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(selector, { duration: 1.2, offset: 0 });
    } else {
      const el = document.querySelector(selector);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    // 00 — LOADER (Duration <= 1.0s)
    const startTime = Date.now();
    const duration = 900;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setLoaderProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => setLoaderComplete(true), 120);
      }
    }, 20);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loaderComplete) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);
    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      // 01 HERO TO 02 PROMPT TO FORM (Cinematic Zoom In)
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#scene-hero",
          start: "top top",
          end: "+=170%",
          pin: true,
          scrub: 0.8,
          onUpdate: (self) => {
            if (self.progress < 0.6) {
              setActiveNavScene("01");
              setNavTheme("dark");
            }
          },
        },
      });

      // FORMIQ zooms IN towards the viewer's screen, flying through the blue R into the structural cards
      heroTl
        .to(
          ".hero-title",
          {
            scale: 9.5,
            opacity: 0,
            transformOrigin: "center center",
            ease: "power2.inOut",
          },
          0
        )
        .to(".hero-letter-f", { x: -160, opacity: 0, ease: "power1.in" }, 0)
        .to(".hero-letter-o", { x: -80, opacity: 0, ease: "power1.in" }, 0)
        .to(".hero-letter-i", { x: 80, opacity: 0, ease: "power1.in" }, 0)
        .to(".hero-letter-q", { x: 160, opacity: 0, ease: "power1.in" }, 0)
        .to(".hero-meta-block", { opacity: 0, y: -25, ease: "power1.out" }, 0)
        .fromTo(
          ".hero-structural-fields",
          { opacity: 0, y: 40, scale: 0.92 },
          { opacity: 1, y: 0, scale: 1, stagger: 0.1, ease: "power2.out" },
          0.18
        );

      // 02 FROM PROMPT TO FORM (Assembly)
      const promptTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#scene-prompt",
          start: "top top",
          end: "+=180%",
          pin: true,
          scrub: 0.8,
          onUpdate: (self) => {
            if (self.progress >= 0.1 && self.progress < 0.9) {
              setActiveNavScene("01");
              setNavTheme("dark");
            }
          },
        },
      });

      promptTl
        .fromTo(".step-describe", { opacity: 0, x: -30 }, { opacity: 1, x: 0 }, 0)
        .fromTo(".step-create", { opacity: 0, x: -30 }, { opacity: 1, x: 0 }, 0.25)
        .fromTo(".step-structure", { opacity: 0, x: -30 }, { opacity: 1, x: 0 }, 0.5)
        .fromTo(".step-publish", { opacity: 0, x: -30 }, { opacity: 1, x: 0 }, 0.75)
        .to(".prompt-assembled-card", { borderColor: "#315CFF", y: -6 }, 0.85);

      // 03 DATA BECOMES VISIBLE (Warm Paper - Horizontal Movement)
      const dataTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#scene-data",
          start: "top top",
          end: "+=220%",
          pin: true,
          scrub: 0.8,
          onUpdate: (self) => {
            if (self.progress >= 0.05 && self.progress <= 0.95) {
              setActiveNavScene("02");
              setNavTheme("paper");
            }
          },
        },
      });

      dataTl.to(".horizontal-data-track", {
        xPercent: -62,
        ease: "none",
      });

      // 04 RESPONSE INTELLIGENCE (Collect -> Understand -> Act)
      const intelTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#scene-intel",
          start: "top top",
          end: "+=220%",
          pin: true,
          scrub: 0.8,
          onUpdate: (self) => {
            if (self.progress >= 0.05 && self.progress <= 0.95) {
              setActiveNavScene("03");
              setNavTheme("dark");
            }
          },
        },
      });

      intelTl
        .to(".phase-01-collect", { opacity: 0, y: -30, duration: 0.3 }, 0.3)
        .fromTo(".phase-02-understand", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, 0.35)
        .to(".phase-02-understand", { opacity: 0, y: -30, duration: 0.3 }, 0.7)
        .fromTo(".phase-03-act", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, 0.75);

      // 05 FORM INDEX
      const indexTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#scene-index",
          start: "top top",
          end: "+=180%",
          pin: true,
          scrub: 0.8,
          onUpdate: (self) => {
            if (self.progress >= 0.05 && self.progress <= 0.95) {
              setActiveNavScene("04");
              setNavTheme("dark");
            }
          },
        },
      });

      indexTl
        .to(".index-row-1", { borderColor: "#315CFF", backgroundColor: "rgba(49, 92, 255, 0.08)" }, 0.1)
        .to(".index-row-1 .index-row-value", { color: "#315CFF" }, 0.1)
        .to(".index-row-1", { borderColor: "#222422", backgroundColor: "#101212" }, 0.28)
        .to(".index-row-1 .index-row-value", { color: "#F4F2EC" }, 0.28)
        .to(".index-row-2", { borderColor: "#315CFF", backgroundColor: "rgba(49, 92, 255, 0.08)" }, 0.32)
        .to(".index-row-2 .index-row-value", { color: "#315CFF" }, 0.32)
        .to(".index-row-2", { borderColor: "#222422", backgroundColor: "#101212" }, 0.50)
        .to(".index-row-2 .index-row-value", { color: "#F4F2EC" }, 0.50)
        .to(".index-row-3", { borderColor: "#315CFF", backgroundColor: "rgba(49, 92, 255, 0.08)" }, 0.54)
        .to(".index-row-3 .index-row-value", { color: "#315CFF" }, 0.54)
        .to(".index-row-3", { borderColor: "#222422", backgroundColor: "#101212" }, 0.72)
        .to(".index-row-3 .index-row-value", { color: "#F4F2EC" }, 0.72)
        .to(".index-row-4", { borderColor: "#315CFF", backgroundColor: "rgba(49, 92, 255, 0.08)" }, 0.76)
        .to(".index-row-4 .index-row-value", { color: "#315CFF" }, 0.76);

      // 06 CLIMAX (FormIQ Blue)
      gsap.timeline({
        scrollTrigger: {
          trigger: "#scene-climax",
          start: "top top",
          end: "+=180%",
          pin: true,
          scrub: 0.8,
          onUpdate: (self) => {
            if (self.progress >= 0.05 && self.progress <= 0.95) {
              setActiveNavScene("04");
              setNavTheme("blue");
            }
          },
        },
      })
      .fromTo(".climax-text-1", { scale: 0.88, opacity: 0 }, { scale: 1, opacity: 1, ease: "power2.out" }, 0)
      .fromTo(".climax-grid-item", { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.12 }, 0.3);
    }, containerRef);

    return () => {
      ctx.revert();
      lenis.destroy();
      lenisRef.current = null;
      gsap.ticker.remove(tickerCallback);
    };
  }, [loaderComplete]);

  return (
    <div ref={containerRef} className="relative w-full bg-[#090A0A] text-[#F4F2EC] overflow-x-hidden">
      {/* 00 — LOADER (Duration <= 1.0s) */}
      {!loaderComplete && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between p-8 md:p-16 bg-[#090A0A] text-[#F4F2EC]">
          <div className="flex justify-between items-start font-mono text-xs uppercase tracking-widest text-[#B8B8B0]">
            <Logo size="sm" theme="dark" />
            <span className="text-[11px] text-[#8A8A82]">FORM INTELLIGENCE</span>
          </div>
          <div className="space-y-4 max-w-xl">
            <div className="font-mono text-xs uppercase tracking-widest text-[#B8B8B0]">
              INITIALIZING WORKFLOW
            </div>
            <div className="w-full bg-[#222422] h-[2px] relative overflow-hidden">
              <div
                className="h-full bg-[#315CFF] transition-all duration-75"
                style={{ width: `${loaderProgress}%` }}
              />
            </div>
            <div className="font-mono text-sm tracking-widest font-tabular text-[#F4F2EC]">
              LOADING {loaderProgress.toString().padStart(3, "0")}%
            </div>
          </div>
          <div className="font-mono text-[10px] text-[#5E605E] uppercase tracking-wider">
            CALIBRATING INTELLIGENCE LAYER • NEXT.JS 15 • POSTGRESQL
          </div>
        </div>
      )}

      {/* FIXED NAVIGATION */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 px-6 md:px-12 py-4 md:py-5 flex items-center justify-between transition-colors duration-500 font-mono text-xs uppercase tracking-wider backdrop-blur-md ${
          navTheme === "paper"
            ? "bg-[#F4F2EC]/92 text-[#090A0A] border-b border-[#E8E5DD]"
            : navTheme === "blue"
            ? "bg-[#315CFF]/95 text-[#090A0A] border-b border-[#2548CC]"
            : "bg-[#090A0A]/92 text-[#F4F2EC] border-b border-[#222422]"
        }`}
      >
        <Logo
          size="sm"
          theme={navTheme === "paper" ? "paper" : navTheme === "blue" ? "light" : "dark"}
          href="/"
        />

        <nav className="hidden md:flex items-center gap-8">
          <button
            type="button"
            onClick={() => scrollToScene("#scene-hero")}
            className={`cursor-pointer transition-colors text-xs font-mono uppercase tracking-wider ${
              activeNavScene === "01" ? "text-[#315CFF] font-semibold" : "text-[#8A8A82] hover:text-[#F4F2EC]"
            }`}
          >
            01 CREATE
          </button>
          <button
            type="button"
            onClick={() => scrollToScene("#scene-data")}
            className={`cursor-pointer transition-colors text-xs font-mono uppercase tracking-wider ${
              activeNavScene === "02" ? "text-[#315CFF] font-semibold" : "text-[#8A8A82] hover:text-[#F4F2EC]"
            }`}
          >
            02 RESPONSES
          </button>
          <button
            type="button"
            onClick={() => scrollToScene("#scene-intel")}
            className={`cursor-pointer transition-colors text-xs font-mono uppercase tracking-wider ${
              activeNavScene === "03" ? "text-[#315CFF] font-semibold" : "text-[#8A8A82] hover:text-[#F4F2EC]"
            }`}
          >
            03 INSIGHTS
          </button>
          <button
            type="button"
            onClick={() => scrollToScene("#scene-index")}
            className={`cursor-pointer transition-colors text-xs font-mono uppercase tracking-wider ${
              activeNavScene === "04" ? "text-[#315CFF] font-semibold" : "text-[#8A8A82] hover:text-[#F4F2EC]"
            }`}
          >
            04 WORKFLOWS
          </button>
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/app"
            className="hidden sm:inline-block font-mono text-xs uppercase tracking-wider text-[#8A8A82] hover:text-[#F4F2EC] transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/app/forms/new"
            className="px-3.5 py-2 border border-current text-xs uppercase tracking-wider font-mono hover:bg-[#315CFF] hover:border-[#315CFF] hover:text-white transition-all flex items-center gap-1.5"
          >
            Create Form <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 01 — HERO SCENE */}
      <section
        id="scene-hero"
        className="relative min-h-[100svh] w-full flex flex-col justify-between p-6 sm:p-8 md:p-14 pt-24 md:pt-28 overflow-hidden bg-[#090A0A]"
      >
        <div className="hero-meta-block flex flex-col sm:flex-row justify-between sm:items-center text-xs font-mono tracking-widest text-[#B8B8B0] border-b border-[#222422] pb-4">
          <div className="flex items-center gap-4 sm:gap-6 text-[11px] sm:text-xs">
            <span>AI FORM GENERATION</span>
            <span>•</span>
            <span>RESPONSE INTELLIGENCE</span>
          </div>
          <div className="mt-2 sm:mt-0 flex items-center gap-4 text-[#8A8A82] text-[11px] sm:text-xs">
            <span>DATA TO INSIGHT</span>
            <span>[SCROLL TO BUILD]</span>
          </div>
        </div>

        {/* Responsive, Balanced Hero Typography with Cinematic Fly-Through Zoom */}
        <div className="relative my-auto flex items-center justify-center select-none py-6 sm:py-10 px-2 sm:px-4">
          <h1 className="hero-title text-[clamp(3.5rem,13vw,10.5rem)] leading-none font-black tracking-tight flex items-center justify-center uppercase font-editorial-hero text-[#F4F2EC] will-change-transform">
            <span className="hero-letter hero-letter-f inline-block">F</span>
            <span className="hero-letter hero-letter-o inline-block">O</span>
            <span className="hero-letter hero-letter-r inline-block text-[#315CFF]">R</span>
            <span className="hero-letter hero-letter-m inline-block">M</span>
            <span className="hero-letter hero-letter-i inline-block text-[#B8B8B0]">I</span>
            <span className="hero-letter hero-letter-q inline-block text-[#8A8A82]">Q</span>
          </h1>
        </div>

        {/* Structural Form Geometry emerging cleanly beneath */}
        <div className="hero-structural-fields opacity-0 translate-y-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 font-mono text-xs border-t border-[#222422] pt-6 text-[#B8B8B0]">
          <div className="border border-[#222422] p-4 sm:p-5 bg-[#101212]/90 backdrop-blur-sm">
            <div className="text-[10px] text-[#5E605E] mb-2 uppercase">01 // INTENT</div>
            <div className="text-sm font-sans text-[#F4F2EC] font-medium">Natural language prompt translated to schema</div>
            <div className="mt-3 h-0.5 w-10 bg-[#315CFF]" />
          </div>
          <div className="border border-[#222422] p-4 sm:p-5 bg-[#101212]/90 backdrop-blur-sm">
            <div className="text-[10px] text-[#5E605E] mb-2 uppercase">02 // FIELD GEOMETRY</div>
            <div className="text-sm font-sans text-[#F4F2EC] font-medium">Dynamic validations, conditional logic, file streams</div>
            <div className="mt-3 h-0.5 w-10 bg-[#8A8A82]" />
          </div>
          <div className="border border-[#222422] p-4 sm:p-5 bg-[#101212]/90 backdrop-blur-sm">
            <div className="text-[10px] text-[#5E605E] mb-2 uppercase">03 // UNDERSTANDING</div>
            <div className="text-sm font-sans text-[#F4F2EC] font-medium">Deterministic metrics + evidence-backed intelligence</div>
            <div className="mt-3 h-0.5 w-10 bg-[#315CFF]" />
          </div>
        </div>
      </section>

      {/* 02 — FROM PROMPT TO FORM */}
      <section
        id="scene-prompt"
        className="relative min-h-[100svh] w-full flex flex-col justify-center items-center p-6 md:p-16 bg-[#090A0A] overflow-hidden border-t border-[#222422]"
      >
        <div className="absolute top-10 left-6 md:left-16 font-mono text-xs uppercase tracking-widest text-[#5E605E]">
          // 02 ARCHITECTURE ASSEMBLY
        </div>

        <div className="prompt-assembled-card w-full max-w-4xl border border-[#222422] bg-[#090A0A] p-6 sm:p-8 md:p-12 transition-all duration-300">
          <div className="flex items-center justify-between border-b border-[#222422] pb-6 mb-8 font-mono text-xs text-[#8A8A82]">
            <span>INPUT STREAM → SPECIFICATION</span>
            <span className="text-[#315CFF] font-semibold">STATUS: ACTIVE GENERATOR</span>
          </div>

          <div className="space-y-6">
            <div className="step-describe flex items-start gap-4">
              <span className="font-mono text-xs text-[#315CFF] pt-1">01</span>
              <div>
                <h3 className="font-mono text-lg font-bold text-[#F4F2EC] uppercase tracking-wide">DESCRIBE</h3>
                <p className="text-sm text-[#B8B8B0] mt-1">
                  "Create a volunteer recruitment form for our college entrepreneurship event. We need students for marketing, technical, design, content, and operations."
                </p>
              </div>
            </div>

            <div className="step-create flex items-start gap-4 border-t border-[#222422] pt-4">
              <span className="font-mono text-xs text-[#8A8A82] pt-1">02</span>
              <div>
                <h3 className="font-mono text-lg font-bold text-[#F4F2EC] uppercase tracking-wide">CREATE</h3>
                <p className="text-sm text-[#B8B8B0] mt-1">
                  Infer questions, field types, validation constraints, and file upload specifications automatically.
                </p>
              </div>
            </div>

            <div className="step-structure flex items-start gap-4 border-t border-[#222422] pt-4">
              <span className="font-mono text-xs text-[#8A8A82] pt-1">03</span>
              <div>
                <h3 className="font-mono text-lg font-bold text-[#F4F2EC] uppercase tracking-wide">STRUCTURE</h3>
                <p className="text-sm text-[#B8B8B0] mt-1">
                  Compile questions into sections with conditional visibility and single-screen mobile rendering.
                </p>
              </div>
            </div>

            <div className="step-publish flex items-start gap-4 border-t border-[#222422] pt-4">
              <span className="font-mono text-xs text-[#315CFF] pt-1">04</span>
              <div>
                <h3 className="font-mono text-lg font-bold text-[#F4F2EC] uppercase tracking-wide">PUBLISH</h3>
                <p className="text-sm text-[#B8B8B0] mt-1">
                  Instant public URL, responsive mobile intake, and QR code ready for mass student distribution.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 03 — DATA BECOMES VISIBLE (Warm Paper - Horizontal Movement) */}
      <section
        id="scene-data"
        className="relative min-h-[100svh] w-full flex flex-col justify-center p-6 md:p-16 bg-[#F4F2EC] text-[#090A0A] overflow-hidden"
      >
        <div className="absolute top-10 left-6 md:left-16 font-mono text-xs uppercase tracking-widest text-[#8A8A82]">
          // 03 RESPONSE ARCHITECTURE • REAL TIME
        </div>

        <div className="horizontal-data-track flex items-center gap-12 md:gap-24 w-max select-none pl-4 md:pl-8">
          {/* Item 1 */}
          <div className="flex flex-col min-w-[260px] sm:min-w-[320px] md:min-w-[380px]">
            <div className="text-[clamp(3.5rem,8vw,6.5rem)] font-black leading-tight font-editorial-hero tracking-tight text-[#090A0A] pb-2">
              10
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-[#5E605E] border-t border-[#D3D0C6] pt-3.5">
              INITIAL SUBMISSIONS • TIMESTAMPS RECORDED
            </div>
            <p className="text-sm text-[#222422] mt-2">
              Instant ingestion into Postgres with zero duplicate collisions.
            </p>
          </div>

          {/* Item 2 */}
          <div className="flex flex-col min-w-[260px] sm:min-w-[320px] md:min-w-[380px]">
            <div className="text-[clamp(3.5rem,8vw,6.5rem)] font-black leading-tight font-editorial-hero tracking-tight text-[#090A0A] pb-2">
              100
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-[#5E605E] border-t border-[#D3D0C6] pt-3.5">
              COHORT CONVERGENCE • COMPLETION RATE 82%
            </div>
            <p className="text-sm text-[#222422] mt-2">
              Real-time branch distributions and qualification criteria verified.
            </p>
          </div>

          {/* Item 3 */}
          <div className="flex flex-col min-w-[260px] sm:min-w-[320px] md:min-w-[380px]">
            <div className="text-[clamp(3.5rem,8vw,6.5rem)] font-black leading-tight font-editorial-hero tracking-tight text-[#090A0A] pb-2">
              1,000
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-[#5E605E] border-t border-[#D3D0C6] pt-3.5">
              MEASURABLE PATTERNS & SCHEDULE CONSTRAINTS
            </div>
            <p className="text-sm text-[#222422] mt-2">
              Statistical variance and availability bottlenecks identified automatically.
            </p>
          </div>

          {/* Item 4 */}
          <div className="scale-num-mask flex flex-col min-w-[280px] sm:min-w-[340px] md:min-w-[420px] pr-12">
            <div className="text-[clamp(3.5rem,8vw,6.5rem)] font-black leading-tight font-editorial-hero tracking-tight text-[#315CFF] pb-2">
              10,000+
            </div>
            <div className="font-mono text-xs uppercase tracking-wider text-[#5E605E] border-t border-[#D3D0C6] pt-3.5">
              SCALE INTELLIGENCE • ACTIONABLE EVIDENCE
            </div>
            <p className="text-sm text-[#222422] mt-2">
              Transform raw response rows into evidence-backed operational decisions.
            </p>
          </div>
        </div>
      </section>

      {/* 04 — RESPONSE INTELLIGENCE (Collect -> Understand -> Act) */}
      <section
        id="scene-intel"
        className="relative min-h-[100svh] w-full flex flex-col justify-center items-center p-6 md:p-16 bg-[#090A0A] overflow-hidden"
      >
        <div className="absolute top-10 left-6 md:left-16 font-mono text-xs uppercase tracking-widest text-[#5E605E]">
          // 04 COGNITIVE PROGRESSION
        </div>

        <div className="relative w-full max-w-4xl min-h-[380px] md:min-h-[440px] flex items-center justify-center">
          {/* Phase 01: COLLECT */}
          <div className="phase-01-collect absolute inset-0 flex flex-col justify-center border border-[#222422] p-8 md:p-12 bg-[#090A0A]">
            <div className="font-mono text-xs text-[#315CFF] uppercase tracking-widest mb-4">01 // COLLECTION</div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black font-editorial-hero uppercase text-[#F4F2EC] tracking-tight">
              COLLECT RESPONSES
            </h2>
            <p className="text-sm sm:text-base text-[#B8B8B0] mt-4 max-w-xl">
              Every form submission is stored with validated data types, submission timestamps, completion durations, and optional file attachments.
            </p>
            <div className="mt-8 font-mono text-[11px] sm:text-xs text-[#5E605E]">
              TABLE SCHEMA: form_responses • response_answers • files
            </div>
          </div>

          {/* Phase 02: UNDERSTAND */}
          <div className="phase-02-understand absolute inset-0 flex flex-col justify-center border border-[#222422] p-8 md:p-12 bg-[#090A0A] opacity-0">
            <div className="font-mono text-xs text-[#315CFF] uppercase tracking-widest mb-4">02 // PATTERNS & EVIDENCE</div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black font-editorial-hero uppercase text-[#F4F2EC] tracking-tight">
              UNDERSTAND PATTERNS
            </h2>
            <p className="text-sm sm:text-base text-[#B8B8B0] mt-4 max-w-xl">
              Instead of generic summaries, FormIQ calculates deterministic statistics first, then synthesizes evidence-backed insights directly tied to your numbers.
            </p>
            <div className="mt-8 font-mono text-[11px] sm:text-xs text-[#315CFF]">
              FINDING: "64% OF RESPONDENTS SELECTED WEEKEND-ONLY AVAILABILITY (311 OF 486 RESPONSES)"
            </div>
          </div>

          {/* Phase 03: ACT */}
          <div className="phase-03-act absolute inset-0 flex flex-col justify-center border border-[#315CFF] p-8 md:p-12 bg-[#090A0A] opacity-0">
            <div className="font-mono text-xs text-[#315CFF] uppercase tracking-widest mb-4">03 // OPERATIONAL ACTION</div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black font-editorial-hero uppercase text-[#F4F2EC] tracking-tight">
              ACT ON INTELLIGENCE
            </h2>
            <p className="text-sm sm:text-base text-[#B8B8B0] mt-4 max-w-xl">
              Identify where you are lagging immediately. Recalibrate event shifts, interview underrepresented tracks, and manage candidate pipelines with confidence.
            </p>
            <div className="mt-8 font-mono text-[11px] sm:text-xs text-[#F4F2EC] flex items-center gap-3">
              <span className="w-2 h-2 bg-[#315CFF]" />
              <span>DECISION FRAMEWORK READY • 0 HALLUCINATIONS</span>
            </div>
          </div>
        </div>
      </section>

      {/* 05 — FORM INDEX (Fixed Viewport & Zero Horizontal Overlap) */}
      <section
        id="scene-index"
        className="relative min-h-[100svh] w-full flex items-center p-6 md:p-16 bg-[#090A0A] overflow-hidden border-t border-[#222422]"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 w-full gap-8 md:gap-12 items-center max-w-7xl mx-auto">
          {/* Typography on Left: Proportioned to fit column cleanly without colliding into table */}
          <div className="md:col-span-5 select-none pr-0 md:pr-4">
            <div className="flex items-center gap-2 mb-3">
              <FormIQMark size={20} />
              <span className="font-mono text-xs text-[#5E605E] uppercase tracking-widest">// 05 SPECIFICATIONS</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black font-editorial-hero uppercase leading-[0.95] tracking-tight text-[#F4F2EC]">
              FORMIQ
            </h2>
            <p className="font-mono text-xs text-[#8A8A82] uppercase tracking-wider mt-4">
              FORM INTELLIGENCE INFRASTRUCTURE
            </p>
          </div>

          {/* Technical Rows on Right: Solid background & crisp spacing */}
          <div className="md:col-span-7 flex flex-col space-y-3 font-mono text-xs md:text-sm">
            <div className="index-row-1 border border-[#222422] bg-[#101212] p-4 flex justify-between items-center transition-colors">
              <span className="text-[#8A8A82]">PLATFORM</span>
              <span className="index-row-value font-bold text-[#F4F2EC]">FORM INTELLIGENCE</span>
            </div>
            <div className="index-row-2 border border-[#222422] bg-[#101212] p-4 flex justify-between items-center transition-colors">
              <span className="text-[#8A8A82]">CREATION</span>
              <span className="index-row-value font-bold text-[#F4F2EC]">NATURAL LANGUAGE ENGINE</span>
            </div>
            <div className="index-row-3 border border-[#222422] bg-[#101212] p-4 flex justify-between items-center transition-colors">
              <span className="text-[#8A8A82]">RESPONSES</span>
              <span className="index-row-value font-bold text-[#F4F2EC]">REAL-TIME POSTGRESQL + RLS</span>
            </div>
            <div className="index-row-4 border border-[#222422] bg-[#101212] p-4 flex justify-between items-center transition-colors">
              <span className="text-[#8A8A82]">ANALYSIS</span>
              <span className="index-row-value font-bold text-[#F4F2EC]">EVIDENCE-BACKED INSIGHTS</span>
            </div>
            <div className="border border-[#222422] bg-[#101212] p-4 flex justify-between items-center text-[#5E605E]">
              <span>WORKFLOWS</span>
              <span className="text-[#8A8A82]">RECRUITMENT • REGISTRATION • SURVEYS • RESEARCH</span>
            </div>
          </div>
        </div>
      </section>

      {/* 06 — CLIMAX (FormIQ Blue) */}
      <section
        id="scene-climax"
        className="relative min-h-[100svh] w-full flex flex-col justify-center items-center p-6 md:p-16 bg-[#315CFF] text-[#090A0A] overflow-hidden"
      >
        <div className="climax-content-wrap flex flex-col items-center text-center select-none max-w-5xl">
          <div className="font-mono text-xs uppercase tracking-widest mb-6 font-bold text-[#090A0A]">
            // 06 CLIMAX TRANSFORMATION
          </div>
          <h2 className="climax-text-1 text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black font-editorial-hero uppercase leading-[1.05] tracking-tight text-[#090A0A]">
            NOT JUST FORMS.
            <br />
            RESPONSE INTELLIGENCE.
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 w-full mt-10 md:mt-12 font-mono text-xs uppercase tracking-widest text-[#090A0A]">
            <div className="climax-grid-item border-2 border-[#090A0A] bg-[#315CFF]/40 backdrop-blur-sm p-4 font-bold">
              FORM
            </div>
            <div className="climax-grid-item border-2 border-[#090A0A] bg-[#315CFF]/40 backdrop-blur-sm p-4 font-bold">
              RESPONSE
            </div>
            <div className="climax-grid-item border-2 border-[#090A0A] bg-[#315CFF]/40 backdrop-blur-sm p-4 font-bold">
              INSIGHT
            </div>
            <div className="climax-grid-item border-2 border-[#090A0A] bg-[#315CFF]/40 backdrop-blur-sm p-4 font-bold">
              ACTION
            </div>
          </div>
        </div>
      </section>

      {/* 07 — FINAL CTA (Quiet Near-Black) */}
      <section
        id="scene-cta"
        className="relative min-h-[100svh] w-full flex flex-col justify-between p-6 sm:p-8 md:p-16 bg-[#090A0A] text-[#F4F2EC] overflow-hidden border-t border-[#222422]"
      >
        <div className="flex justify-between items-center font-mono text-xs text-[#8A8A82] uppercase tracking-widest">
          <Logo size="sm" theme="dark" />
          <span>DATA WORKFLOW COMPLETE</span>
        </div>

        <div className="my-auto max-w-4xl space-y-6 py-8">
          <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black font-editorial-hero uppercase tracking-tight leading-[1.05]">
            TURN QUESTIONS INTO STRUCTURE.
            <br />
            <span className="text-[#315CFF]">TURN RESPONSES INTO INSIGHT.</span>
          </h2>

          <p className="text-sm sm:text-base md:text-lg text-[#B8B8B0] max-w-2xl font-sans leading-relaxed">
            Build your first AI-generated form in 30 seconds. Publish instantly, gather responses with zero friction, and make informed operational decisions backed by verifiable evidence.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
            <Link
              href="/app/forms/new"
              className="group relative px-7 py-4 bg-[#F4F2EC] text-[#090A0A] font-mono text-xs sm:text-sm uppercase tracking-wider font-bold overflow-hidden transition-all duration-300 flex items-center justify-center gap-3"
            >
              <span className="relative z-10">CREATE YOUR FIRST FORM</span>
              <ChevronRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1.5" />
              <div className="absolute inset-0 bg-[#315CFF] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Link>

            <Link
              href="/app"
              className="px-7 py-4 border border-[#222422] text-[#F4F2EC] font-mono text-xs sm:text-sm uppercase tracking-wider hover:border-[#F4F2EC] transition-colors flex items-center justify-center"
            >
              EXPLORE DEMO DASHBOARD
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-t border-[#222422] pt-6 font-mono text-xs text-[#5E605E]">
          <div>formiq.app • PRODUCTION ENGINE</div>
          <div className="mt-2 sm:mt-0">COPYRIGHT © 2026 FORMIQ. ALL RIGHTS RESERVED.</div>
        </div>
      </section>
    </div>
  );
}
