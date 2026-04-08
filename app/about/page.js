import Link from "next/link";
import { SiteHeader } from "../../components/site-header";

export const metadata = {
  title: "关于",
  description: "这个站是谁在写、平时写什么，以及为什么会一直更下去。",
};

const focusAreas = [
  "前端和页面体验",
  "博客和内容结构",
  "写作、记录和知识整理",
  "把小产品慢慢做完整",
];

const writingModes = [
  "长文：把一个问题写透，或者认真复盘一次项目",
  "速记：先把当下的想法记下来，不强迫它立刻完整",
  "指南：把做事的方法整理出来，方便以后直接复用",
  "现场记录：把做站、改功能、踩坑时的过程留下来",
];

export default function AboutPage() {
  return (
    <main className="site-shell inner-page">
      <SiteHeader />

      <section className="page-hero">
        <p className="eyebrow">关于这个站</p>
        <h1>这个站主要拿来写技术、设计，还有我做东西时一路留下的想法。</h1>
        <p className="hero-lead">
          我不太想把 blog 做成只摆结果的地方。比起一次写得很完整，我更在意能不能持续更新，能不能把真正做事时的过程也留住。
        </p>
      </section>

      <section className="about-layout">
        <div className="about-panel">
          <h2>我的工作方式</h2>
          <p>
            我比较习惯一边做一边整理。做页面时会想结构和气质，写文章时会想顺序和节奏，最后希望它们落到同一个站里，不要彼此分开。
          </p>
          <p>
            这个站一开始只是 Markdown 博客，后来我一点点给它加了后台、登录和发布流程。现在我一边写东西，一边拿它练平台开发。
          </p>
        </div>

        <aside className="about-panel about-panel-accent">
          <p className="signal-label">平时会写</p>
          <ul className="focus-list">
            {focusAreas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">更新方式</p>
            <h2>我大概会这样用这个 blog</h2>
          </div>
          <p>我不想把每次更新都写成同一种东西，所以先给自己留了几种比较顺手的写法。</p>
        </div>

        <div className="writing-tracks-grid">
          {writingModes.map((mode) => (
            <article key={mode} className="track-card">
              <p>{mode}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
