"use client";

import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Image from "@/components/ui/image";
import { useLanguage } from "@/components/providers/LanguageProvider";
import styles from "./AboutStory.module.css";

const photos = ["/images/CIVIC R/0r.png", "/images/g9r.png", "/images/DETAIL g9/01.jpg", "/images/CIVIC R/03.jpg"];
const chapterPosition = (index: number) => index === 0 ? 0 : (index + 0.2) / 3.8;
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};

export function AboutStory() {
  const { t } = useLanguage();
  const root = useRef<HTMLElement>(null);
  const panels = useRef<(HTMLElement | null)[]>([]);
  const progress = useRef<HTMLDivElement>(null);
  const markers = useRef<(HTMLAnchorElement | null)[]>([]);
  const copy = t.about.scrollStory;
  const chapters = [
    { label: copy.identity, title: t.about.heroTagline, description: copy.introDesc },
    { label: copy.origin, title: t.about.storyTitle, description: copy.originDesc },
    { label: copy.detail, title: copy.detailTitle, description: copy.detailDesc },
    { label: copy.drive, title: copy.driveTitle, description: copy.driveDesc },
  ];

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-height: 600px)");
    const stage = element.querySelector<HTMLElement>(`.${styles.stage}`);
    if (!stage) return;
    let frame = 0;
    let lastTime = 0;
    let start = 0;
    let distance = 1;
    let target = 0;
    let position = 0;
    let staticLayout = false;
    let activeChapter = -1;

    const render = () => {
      // Every layer shares the same smoothed position, including on reversal.
      const timeline = position * 3.8;
      const active = Math.min(3, Math.floor(timeline + 0.21));
      element.style.setProperty("--journey", String(position));
      element.style.setProperty("--flow-offset", String(-position * 900));
      panels.current.forEach((panel, index) => {
        if (!panel) return;
        const offset = timeline - index;
        const enter = index === 0 ? 1 : ease((offset + 0.42) / 0.42);
        // Blend over the outgoing scene to keep the background continuous.
        const visible = enter > 0 && (index === 3 || offset < 1);
        panel.style.visibility = staticLayout || visible ? "visible" : "hidden";
        if (staticLayout || visible) {
          panel.style.setProperty("--visibility", String(enter));
          const textIn = index === 0 ? 1 : ease((offset + 0.16) / 0.16);
          const textOut = index === 3 ? 1 : 1 - ease((offset - 0.58) / 0.16);
          panel.style.setProperty("--copy-opacity", String(textIn * textOut));
          panel.style.setProperty("--text-y", `${(1 - enter) * 45}px`);
          panel.style.setProperty("--photo-scale", String(1.02 + ease(offset) * 0.08));
          panel.style.setProperty("--photo-x", `${(1 - enter) * 4 - ease(offset) * 2}%`);
          panel.style.setProperty("--word-x", `${ease(offset) * -4}%`);
          panel.style.setProperty("--scan-progress", String(ease(offset)));
        }
        if (activeChapter !== active) {
          panel.inert = !staticLayout && index !== active;
          panel.setAttribute("aria-hidden", String(!staticLayout && index !== active));
          markers.current[index]?.setAttribute("aria-current", index === active ? "step" : "false");
        }
      });
      activeChapter = active;
      if (progress.current) progress.current.style.transform = `scaleX(${position})`;
    };

    const animate = (now: number) => {
      frame = 0;
      const elapsed = lastTime ? Math.min(now - lastTime, 64) : 1000 / 60;
      lastTime = now;
      // Time-based damping feels the same on 60 Hz and high-refresh displays.
      position += (target - position) * (1 - Math.exp(-elapsed / 110));
      const settled = Math.abs(target - position) < 0.00003;
      if (settled) position = target;
      render();
      if (!settled) frame = requestAnimationFrame(animate);
      else lastTime = 0;
    };

    const onScroll = () => {
      target = staticLayout ? 0 : clamp((window.scrollY - start) / distance);
      if (staticLayout || document.hidden || window.scrollY < start || window.scrollY > start + distance) {
        cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
        position = target;
        render();
      } else if (!frame && target !== position) {
        frame = requestAnimationFrame(animate);
      }
    };

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      staticLayout = motion.matches || compact.matches;
      const top = parseFloat(getComputedStyle(stage).top) || 0;
      start = window.scrollY + element.getBoundingClientRect().top - top;
      distance = Math.max(1, element.offsetHeight - stage.offsetHeight);
      position = target = staticLayout ? 0 : clamp((window.scrollY - start) / distance);
      activeChapter = -1;
      render();
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", measure);
    motion.addEventListener("change", measure);
    compact.addEventListener("change", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(stage);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", measure);
      motion.removeEventListener("change", measure);
      compact.removeEventListener("change", measure);
      observer.disconnect();
    };
  }, []);

  function goToChapter(event: React.MouseEvent<HTMLAnchorElement>, index: number) {
    const element = root.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce), (max-height: 600px)").matches) return;
    event.preventDefault();
    const stage = element.querySelector<HTMLElement>(`.${styles.stage}`);
    const distance = element.offsetHeight - (stage?.offsetHeight ?? 0);
    const top = stage ? parseFloat(getComputedStyle(stage).top) || 0 : 0;
    window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - top + distance * chapterPosition(index), behavior: "smooth" });
  }

  return (
    <section ref={root} className={styles.story} aria-label={t.about.heroHighlight}>
      <div className={styles.stage}>
        <div className={styles.masthead}>
          <h1><span className={styles.statusDot} /> {t.about.heroTitle} <strong>SOUTH AERO</strong><span className={styles.archive}> / {copy.archive}</span></h1>
          <a href="#about-engineering" className={styles.skip}>{copy.skip} <ArrowDown size={13} /></a>
        </div>
        {chapters.map((chapter, index) => (
          <article key={index} id={`about-chapter-${index}`} ref={(node) => { panels.current[index] = node; }} className={styles.panel} data-scene={index}>
            <div className={styles.blueprint} aria-hidden="true" />
            <div className={styles.wordmark} aria-hidden="true">
              <span>{copy.statements[index].line1}</span>
              <span>{copy.statements[index].line2}<i>+</i></span>
            </div>
            <div className={styles.photo}>
              <Image src={photos[index]} alt="" fill sizes="(max-width: 767px) 120vw, 80vw" priority={index === 0} className={styles.image} />
            </div>
            <div className={styles.shade} />
            <svg className={styles.airflow} viewBox="0 0 1200 600" fill="none" preserveAspectRatio="none" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((line) => (
                <path key={line} d={`M-100 ${180 + line * 42} C250 ${180 + line * 42}, 310 ${20 + line * 55}, 630 ${100 + line * 52} S1000 ${230 + line * 34}, 1300 ${100 + line * 50}`} />
              ))}
            </svg>
            <div className={styles.scan} aria-hidden="true" />
            <div className={styles.target} aria-hidden="true"><span />+</div>
            <div className={styles.specimen} aria-hidden="true">SA—0{index + 1}<span>{copy.specimen}</span></div>
            <div className={styles.number} aria-hidden="true">/ 0{index + 1}</div>
            <div className={styles.copy}>
              <p className={styles.eyebrow}><span /> {chapter.label}</p>
              <h2>{index === 0 ? copy.introTitle : chapter.title}</h2>
              <p className={styles.description}>{chapter.description}</p>
              {index === 3 && <Link href="/products" className={styles.cta}>{copy.explore} <ArrowUpRight size={18} /></Link>}
            </div>
          </article>
        ))}
        <div className={styles.sideLabel} aria-hidden="true">SOUTH AERO PERFORMANCE — {copy.edition}</div>
        <div className={styles.footer}>
          <p className={styles.hint}><ArrowDown size={16} /> {copy.scroll}</p>
          <nav aria-label={copy.chapters} className={styles.chapters}>
            {chapters.map((chapter, index) => (
              <a key={index} aria-label={`0${index + 1} ${chapter.label}`} ref={(node) => { markers.current[index] = node; }} href={`#about-chapter-${index}`} onClick={(event) => goToChapter(event, index)}>
                <span className={styles.chapterIndex}>0{index + 1}</span><span className={styles.chapterLabel}>{chapter.label}</span><span className={styles.chapterLine} />
              </a>
            ))}
          </nav>
        </div>
        <div className={styles.track} aria-hidden="true"><div ref={progress} /></div>
      </div>
    </section>
  );
}
