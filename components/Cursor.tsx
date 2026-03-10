"use client";

import { useEffect, useRef } from "react";

export default function Cursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const mouse   = useRef({ x: 0, y: 0 });
  const ring    = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Hide on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (dotRef.current) {
        dotRef.current.style.left = `${e.clientX}px`;
        dotRef.current.style.top  = `${e.clientY}px`;
      }
    };
    window.addEventListener("mousemove", onMove);

    let rafId: number;
    const animate = () => {
      ring.current.x += (mouse.current.x - ring.current.x) * 0.12;
      ring.current.y += (mouse.current.y - ring.current.y) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.left = `${ring.current.x}px`;
        ringRef.current.style.top  = `${ring.current.y}px`;
      }
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    // Expand ring on interactive elements
    const interactives = document.querySelectorAll("a, button, [data-cursor-expand]");
    const expand = () => {
      if (ringRef.current) {
        ringRef.current.style.width  = "60px";
        ringRef.current.style.height = "60px";
        ringRef.current.style.opacity = "0.5";
      }
    };
    const shrink = () => {
      if (ringRef.current) {
        ringRef.current.style.width  = "36px";
        ringRef.current.style.height = "36px";
        ringRef.current.style.opacity = "1";
      }
    };
    interactives.forEach(el => {
      el.addEventListener("mouseenter", expand);
      el.addEventListener("mouseleave", shrink);
    });

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
      interactives.forEach(el => {
        el.removeEventListener("mouseenter", expand);
        el.removeEventListener("mouseleave", shrink);
      });
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 pointer-events-none z-[9999]"
      style={{ mixBlendMode: "difference" }}
    >
      {/* Dot */}
      <div
        ref={dotRef}
        className="absolute w-2 h-2 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"
      />
      {/* Ring */}
      <div
        ref={ringRef}
        className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "36px",
          height: "36px",
          border: "1.5px solid white",
          transition: "width 0.25s cubic-bezier(0.22,1,0.36,1), height 0.25s cubic-bezier(0.22,1,0.36,1), opacity 0.2s",
        }}
      />
    </div>
  );
}
