import { store, K } from "./store";
import type { Community, Post } from "./types";

/**
 * Removes every post, call and their replies, leaving profiles and
 * communities in place. Used to clear the test feed before launch.
 */
export async function wipeContent(): Promise<{ posts: number; comments: number }> {
  const feedIds = await store.zrange(K.feed, 0, 9999, true);
  const callIds = await store.zrange(K.allCalls, 0, 9999, true);

  const communityIds = await store.zrange(K.communities, 0, 999, true);
  const communities = (await store.mget<Community>(communityIds.map(K.community))).filter(
    (c): c is Community => Boolean(c)
  );
  const communityPostIds = (
    await Promise.all(communities.map((c) => store.zrange(K.communityPosts(c.id), 0, 9999, true)))
  ).flat();

  const ids = [...new Set([...feedIds, ...callIds, ...communityPostIds])];
  const posts = (await store.mget<Post>(ids.map(K.post))).filter((p): p is Post => Boolean(p));

  let comments = 0;

  for (const id of ids) {
    const commentIds = await store.zrange(K.comments(id), 0, 999, true);
    for (const commentId of commentIds) {
      await store.del(K.comment(commentId));
      comments++;
    }
    await store.del(K.comments(id));
    await store.del(K.likes(id));
    await store.del(K.peak(id));
    await store.del(`radar:ms:${id}`);
    await store.del(K.post(id));
  }

  // Indexes the posts were listed in.
  await store.del(K.feed);
  await store.del(K.allCalls);
  await store.del(K.callIndex);
  for (const post of posts) {
    await store.del(K.userPosts(post.author));
    if (post.ca) {
      await store.del(K.callPosts(post.ca));
      await store.del(`radar:curve:${post.ca}`);
    }
  }
  for (const community of communities) {
    await store.del(K.communityPosts(community.id));
  }

  return { posts: ids.length, comments };
}
