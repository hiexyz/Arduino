const listEl = document.getElementById("story-list");
const dateEl = document.getElementById("date-label");
const taglineEl = document.getElementById("tagline");
const countEl = document.getElementById("story-count");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refresh-scores");

function hnItemUrl(id) {
  return `https://news.ycombinator.com/item?id=${id}`;
}

function formatScore(n) {
  return `${Number(n || 0).toLocaleString("ja-JP")} pts`;
}

function renderStory(story, index) {
  const li = document.createElement("li");
  li.className = "story";
  li.style.animationDelay = `${Math.min(index * 0.05, 0.6)}s`;

  const articleUrl = story.url || hnItemUrl(story.id);
  const comments = story.comments ?? story.descendants ?? 0;

  li.innerHTML = `
    <div class="rank">${String(index + 1).padStart(2, "0")}</div>
    <article class="story-body">
      <div class="cat-row">
        <span class="cat">${story.category || "話題"}</span>
        <span data-score>${formatScore(story.score)}</span>
        <span>${Number(comments).toLocaleString("ja-JP")} comments</span>
        <span>by ${story.by || "unknown"}</span>
      </div>
      <h3 class="title-ja">
        <a href="${articleUrl}" target="_blank" rel="noopener noreferrer">${story.titleJa}</a>
      </h3>
      <p class="summary">${story.summaryJa}</p>
      <p class="title-en">${story.title}</p>
      <div class="actions">
        <a href="${articleUrl}" target="_blank" rel="noopener noreferrer">記事を開く</a>
        <a href="${hnItemUrl(story.id)}" target="_blank" rel="noopener noreferrer">HN で議論</a>
      </div>
    </article>
  `;

  return li;
}

function observeStories() {
  const items = listEl.querySelectorAll(".story");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12 }
  );

  items.forEach((el) => io.observe(el));
}

function renderDigest(digest) {
  dateEl.textContent = digest.dateLabel || "Hacker News Digest";
  if (digest.tagline) taglineEl.textContent = digest.tagline;

  const stories = digest.stories || [];
  countEl.textContent = `${stories.length} stories`;
  listEl.replaceChildren(...stories.map((story, i) => renderStory(story, i)));
  observeStories();
  return stories;
}

async function fetchLiveScore(id) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
      { signal: controller.signal }
    );
    if (!res.ok) throw new Error(`HN item ${id}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run())
  );
  return results;
}

async function refreshScores(stories) {
  statusEl.textContent = "HN から最新スコアを取得中…";
  refreshBtn.disabled = true;

  try {
    const updates = await mapPool(stories, 4, async (story) => {
      try {
        const live = await fetchLiveScore(story.id);
        return {
          id: story.id,
          score: live?.score ?? story.score,
          comments: live?.descendants ?? story.comments,
          ok: true,
        };
      } catch (err) {
        console.warn("score fetch failed", story.id, err);
        return {
          id: story.id,
          score: story.score,
          comments: story.comments,
          ok: false,
        };
      }
    });

    const byId = new Map(updates.map((u) => [u.id, u]));
    for (const li of listEl.querySelectorAll(".story")) {
      const link = li.querySelector(".actions a[href*='item?id=']");
      const id = Number(new URL(link.href).searchParams.get("id"));
      const live = byId.get(id);
      if (!live) continue;
      const scoreEl = li.querySelector("[data-score]");
      const commentEl = scoreEl?.nextElementSibling;
      if (scoreEl) scoreEl.textContent = formatScore(live.score);
      if (commentEl) {
        commentEl.textContent = `${Number(live.comments || 0).toLocaleString("ja-JP")} comments`;
      }
    }

    const failed = updates.filter((u) => !u.ok).length;
    const time = new Date().toLocaleTimeString("ja-JP");
    statusEl.textContent =
      failed === 0
        ? `スコア更新完了（${time}）`
        : `スコア更新完了（${time}・${failed}件は取得失敗）`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = "スコア更新に失敗しました。ネットワークを確認してください。";
  } finally {
    refreshBtn.disabled = false;
  }
}

async function main() {
  const res = await fetch("./data/digest.json", { cache: "no-store" });
  if (!res.ok) throw new Error("digest.json を読めませんでした");
  const digest = await res.json();
  const stories = renderDigest(digest);

  refreshBtn.addEventListener("click", () => refreshScores(stories));
}

main().catch((err) => {
  console.error(err);
  statusEl.textContent = "ダイジェストの読み込みに失敗しました。";
});
