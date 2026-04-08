"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "reader-scroll-step";
const DEFAULT_STEP = 8;
const MIN_STEP = 2;
const MAX_STEP = 20;
const STEP_DELAY = 40;

function clampStep(value) {
  return Math.max(MIN_STEP, Math.min(MAX_STEP, value));
}

export function ReadingModeControls({ targetId }) {
  const [step, setStep] = useState(DEFAULT_STEP);
  const [status, setStatus] = useState("待开始");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const buttonRef = useRef(null);
  const timerRef = useRef(null);
  const stepRef = useRef(DEFAULT_STEP);

  stepRef.current = step;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    try {
      const savedStep = Number(window.localStorage.getItem(STORAGE_KEY));
      if (!Number.isNaN(savedStep) && savedStep) {
        setStep(clampStep(savedStep));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(step));
    } catch {}
  }, [step]);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return undefined;

    target.dataset.readerRunning = isPlaying ? "true" : "false";

    return () => {
      delete target.dataset.readerRunning;
    };
  }, [isPlaying, targetId]);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const tick = () => {
      const maxScrollTop =
        document.documentElement.scrollHeight - window.innerHeight - 4;

      if (window.scrollY >= maxScrollTop) {
        setIsPlaying(false);
        setStatus("已结束");
        return;
      }

      window.scrollBy(0, stepRef.current);
    };

    tick();
    timerRef.current = window.setInterval(tick, STEP_DELAY);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!isPlaying) return;
      if (buttonRef.current?.contains(event.target)) return;

      setIsPlaying(false);
      setStatus("点击屏幕已暂停");
    };

    const handleWheel = (event) => {
      if (!isPlaying) return;

      event.preventDefault();

      const magnitude = Math.max(
        1,
        Math.round(Math.abs(event.deltaY || 0) / 120) || 1,
      );
      const delta = event.deltaY > 0 ? magnitude : -magnitude;

      setStep((current) => {
        const next = clampStep(current + delta);
        setStatus(`滚动中（速度 ${next}）`);
        return next;
      });
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("wheel", handleWheel);
    };
  }, [isPlaying]);

  function handleToggle() {
    if (isPlaying) {
      setIsPlaying(false);
      setStatus("已暂停");
      return;
    }

    setIsPlaying(true);
    setStatus(`滚动中（速度 ${stepRef.current}）`);
  }

  return (
    <div
      className="reader-toolbar reader-toolbar-minimal"
      aria-label="自动阅读控制器"
    >
      <div className="reader-toolbar-main">
        <div className="reader-toolbar-copy">
          <p className="signal-label">自动阅读</p>
          <strong>自动滚动阅读</strong>
          <span>点击后正文会自动缓慢下滚，再点一次即可暂停。</span>
        </div>

        <button
          ref={buttonRef}
          type="button"
          className={`reader-play-button ${isPlaying ? "is-active" : ""}`}
          onClick={handleToggle}
        >
          {isPlaying ? "暂停滚动" : "开始滚动"}
        </button>
      </div>

      <p className="reader-minimal-status">
        当前状态:
        <span>{status}</span>
      </p>
      <p className="reader-minimal-speed">
        当前速度:
        <span>{step} px/步</span>
      </p>
      <p className="reader-minimal-hint">
        提示：滚动中点击屏幕任意位置可暂停，向下滚轮加速，向上滚轮减速。
      </p>
      {isMounted
        ? createPortal(
            <aside className="reader-speed-float" aria-label="当前自动阅读速度">
              <span className="reader-speed-float-label">速度</span>
              <strong>{step} px/步</strong>
              <span className="reader-speed-float-meta">始终固定在视窗内</span>
            </aside>,
            document.body,
          )
        : null}
    </div>
  );
}
