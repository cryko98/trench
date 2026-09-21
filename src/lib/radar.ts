import { store, K } from "./store";
import { getTokens } from "./token";
import { callMultiple } from "./format";
import type { Post } from "./types";
import { RADAR_AUTHOR } from "./constants";

export { RADAR_AUTHOR };

const MILESTONES = [2, 5, 10, 25, 50, 100, 250, 500, 1000];
const SWEEP_EVERY_SECONDS = 60;
const SCAN_CALLS = 60;
const MAX_PER_SWEEP = 3;

function newId() {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

async function publish(post: Post) {
  await store.set(K.post(post.id), post);
  await store.zadd(K.feed, post.id, post.createdAt);
  if (post.ca) {
    await store.zadd(K.callPosts(post.ca), post.id, post.createdAt);
  }
}

/**
 * Watches the calls already on the board and reports what happens to them:
 * a call crossing 2x, 5x, 10x…, or a called coin graduating off the bonding
 * curve. Runs off normal traffic, at most once a minute, so the feed has a
 * pulse even when nobody is posting.
 */
export async function sweepRadar(): Promise<void> {
  if (await store.get<number>("radar:sweeping")) return;
  await store.set("radar:sweeping", 1, { ex: SWEEP_EVERY_SECONDS });

  const ids = await store.zrange(K.allCalls, 0, SCAN_CALLS - 1, true);
  if (ids.length === 0) return;

  const rows = await store.mget<Post>(ids.map(K.post));
  const calls = rows.filter((p): p is Post => Boolean(p?.ca) && Boolean(p?.callMcap));
  if (calls.length === 0) return;

  const tokens = await getTokens(calls.map((p) => p.ca!));
  const peaks = await store.mget<number>(calls.map((p) => K.peak(p.id)));
  const announcedMilestones = await store.mget<number>(
    calls.map((p) => `radar:ms:${p.id}`)
  );
  const wasBonding = await store.mget<number>(
    calls.map((p) => `radar:curve:${p.ca}`)
  );

  let published = 0;

  for (let i = 0; i < calls.length && published < MAX_PER_SWEEP; i++) {
    const call = calls[i];
    const token = tokens.get(call.ca!);
    if (!token) continue;

    // 1. A coin someone called graduated off the curve.
    if (token.bonding) {
      if (!wasBonding[i]) await store.set(`radar:curve:${call.ca}`, 1);
    } else if (wasBonding[i]) {
      await store.del(`radar:curve:${call.ca}`);
      await publish({
        id: newId(),
        author: RADAR_AUTHOR,
        text: `$${token.symbol.replace(/^\$+/, "")} just graduated off the pump.fun bonding curve.`,
        ca: call.ca,
        callMcap: call.callMcap,
        callToken: { name: token.name, symbol: token.symbol, image: token.image },
        communityId: null,
        radar: { kind: "migration", postId: call.id },
        createdAt: Date.now(),
      });
      published++;
      continue;
    }

    // 2. A call crossed a milestone it has never crossed before.
    const peak = peaks[i] ?? call.callMcap;
    const multiple = callMultiple(call.callMcap, peak);
    if (multiple === null) continue;

    const reached = [...MILESTONES].reverse().find((m) => multiple >= m);
    if (!reached) continue;
    if ((announcedMilestones[i] ?? 0) >= reached) continue;

    await store.set(`radar:ms:${call.id}`, reached);
    await publish({
      id: newId(),
      author: RADAR_AUTHOR,
      text: `$${token.symbol.replace(/^\$+/, "")} hit ${reached}x since it was called.`,
      ca: call.ca,
      callMcap: call.callMcap,
      callToken: { name: token.name, symbol: token.symbol, image: token.image },
      communityId: null,
      radar: { kind: "milestone", postId: call.id, x: reached },
      createdAt: Date.now(),
    });
    published++;
  }
}
