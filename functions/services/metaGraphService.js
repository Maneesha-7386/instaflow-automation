/**
 * Official Meta Graph API Integration Service
 * Handles OAuth code exchange, long-lived tokens, Instagram Business account lookup,
 * 2-step Media Container publishing, and compliant comment/DM replies.
 */
const { envConfig } = require('../config/env');

function assertMetaCredentials() {
  const { appId, appSecret } = envConfig.meta;
  if (!appId || appId.startsWith('YOUR_') || !appSecret || appSecret.startsWith('YOUR_')) {
    const err = new Error(
      'META_APP_SECRET is not configured in functions/.env. Add your Meta App Secret from Meta Developer Dashboard.'
    );
    err.statusCode = 503;
    err.code = 'META_CREDENTIALS_MISSING';
    throw err;
  }
}

function graphBaseUrl() {
  return `https://graph.facebook.com/${envConfig.meta.graphApiVersion || 'v19.0'}`;
}

async function fetchGraphJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const errMsg = data?.error?.message || `Meta Graph API error (HTTP ${res.status})`;
    const err = new Error(errMsg);
    err.statusCode = res.status >= 400 ? res.status : 502;
    err.metaError = data.error || null;
    err.code = data?.error?.code ? `META_${data.error.code}` : `HTTP_${res.status}`;
    throw err;
  }
  return data;
}

async function exchangeCodeForLongLivedToken(code, redirectUri) {
  assertMetaCredentials();
  const base = graphBaseUrl();
  const targetRedirect = redirectUri || envConfig.meta.redirectUri;

  const tokenParams = new URLSearchParams({
    client_id: envConfig.meta.appId,
    client_secret: envConfig.meta.appSecret,
    redirect_uri: targetRedirect,
    code,
  });

  const shortData = await fetchGraphJson(`${base}/oauth/access_token?${tokenParams.toString()}`);

  const longParams = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: envConfig.meta.appId,
    client_secret: envConfig.meta.appSecret,
    fb_exchange_token: shortData.access_token,
  });

  const longData = await fetchGraphJson(`${base}/oauth/access_token?${longParams.toString()}`);
  return {
    accessToken: longData.access_token || shortData.access_token,
    expiresIn: longData.expires_in || shortData.expires_in || 5184000,
  };
}

async function fetchConnectedInstagramAccounts(userAccessToken) {
  const base = graphBaseUrl();
  const fields =
    'id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}';
  const encodedFields = encodeURIComponent(fields);
  
  // 1. Inspect granted permissions
  try {
    const perms = await fetchGraphJson(
      `${base}/me/permissions?access_token=${encodeURIComponent(userAccessToken)}`
    );
    console.log('[fetchConnectedInstagramAccounts] permissions:', JSON.stringify(perms));
  } catch (err) {
    console.warn('[fetchConnectedInstagramAccounts] permissions query failed:', err.message);
  }

  // 2. Query /me/accounts
  let allPages = [];
  try {
    const pagesData = await fetchGraphJson(
      `${base}/me/accounts?fields=${encodedFields}&access_token=${encodeURIComponent(userAccessToken)}`
    );
    console.log('[fetchConnectedInstagramAccounts] /me/accounts result:', JSON.stringify(pagesData));
    if (Array.isArray(pagesData?.data)) {
      allPages.push(...pagesData.data);
    }
  } catch (err) {
    console.warn('[fetchConnectedInstagramAccounts] /me/accounts failed:', err.message);
  }

  // 3. Fallback: Query /me?fields=accounts
  try {
    const meWithAccounts = await fetchGraphJson(
      `${base}/me?fields=id,name,accounts{${fields}}&access_token=${encodeURIComponent(userAccessToken)}`
    );
    console.log('[fetchConnectedInstagramAccounts] /me accounts subfield:', JSON.stringify(meWithAccounts));
    if (Array.isArray(meWithAccounts?.accounts?.data)) {
      for (const p of meWithAccounts.accounts.data) {
        if (!allPages.some((existing) => existing.id === p.id)) {
          allPages.push(p);
        }
      }
    }
  } catch (err) {
    console.warn('[fetchConnectedInstagramAccounts] /me accounts query failed:', err.message);
  }

  // 4. Optional query for configured page ID if defined in environment
  const envPageId = process.env.META_DEFAULT_PAGE_ID;
  if (envPageId && !allPages.some((p) => p.id === envPageId)) {
    try {
      const directPage = await fetchGraphJson(
        `${base}/${envPageId}?fields=${encodedFields}&access_token=${encodeURIComponent(userAccessToken)}`
      );
      if (directPage?.id) {
        allPages.push(directPage);
      }
    } catch (err) {
      console.warn(`[fetchConnectedInstagramAccounts] configured page query skipped:`, err.message);
    }
  }

  // 5. Fallback: Query /me/businesses for business-owned pages
  try {
    const bizData = await fetchGraphJson(
      `${base}/me/businesses?fields=id,name,owned_pages{${fields}}&access_token=${encodeURIComponent(userAccessToken)}`
    );
    console.log('[fetchConnectedInstagramAccounts] /me/businesses result:', JSON.stringify(bizData));
    if (Array.isArray(bizData?.data)) {
      for (const biz of bizData.data) {
        if (Array.isArray(biz.owned_pages?.data)) {
          for (const bp of biz.owned_pages.data) {
            if (!allPages.some((p) => p.id === bp.id)) {
              allPages.push(bp);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[fetchConnectedInstagramAccounts] /me/businesses query failed:', err.message);
  }

  console.log(`[fetchConnectedInstagramAccounts] Total pages discovered: ${allPages.length}`);

  const accounts = [];
  for (const page of allPages) {
    const ig = page.instagram_business_account;
    if (!ig?.id) {
      // Also try querying /{page-id}/instagram_business_account directly if not nested
      try {
        const directIg = await fetchGraphJson(
          `${base}/${page.id}?fields=instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}&access_token=${encodeURIComponent(page.access_token || userAccessToken)}`
        );
        console.log(`[fetchConnectedInstagramAccounts] direct page ${page.id} ig query:`, JSON.stringify(directIg));
        if (directIg?.instagram_business_account?.id) {
          page.instagram_business_account = directIg.instagram_business_account;
        }
      } catch (err) {
        console.warn(`[fetchConnectedInstagramAccounts] page ${page.id} direct ig query failed:`, err.message);
      }
    }

    const resolvedIg = page.instagram_business_account;
    if (!resolvedIg?.id) {
      console.warn(`[fetchConnectedInstagramAccounts] Page ${page.id} (${page.name}) has no linked instagram_business_account`);
      continue;
    }

    let accountType = 'Creator';
    try {
      const igDetails = await fetchGraphJson(
        `${base}/${resolvedIg.id}?fields=account_type&access_token=${encodeURIComponent(page.access_token || userAccessToken)}`
      );
      if (igDetails?.account_type === 'MEDIA_CREATOR') {
        accountType = 'Creator';
      } else if (igDetails?.account_type === 'BUSINESS') {
        accountType = 'Business';
      }
    } catch {
      accountType = 'Creator';
    }

    accounts.push({
      igUserId: resolvedIg.id,
      pageId: page.id,
      pageName: page.name || 'Facebook Page',
      pageAccessToken: page.access_token || userAccessToken,
      handle: resolvedIg.username ? `@${resolvedIg.username}` : `@ig_${resolvedIg.id.slice(-6)}`,
      name: resolvedIg.name || resolvedIg.username || page.name || 'Instagram Account',
      profilePictureUrl: resolvedIg.profile_picture_url || '',
      followersCount: resolvedIg.followers_count || 0,
      mediaCount: resolvedIg.media_count || 0,
      accountType,
    });
  }

  return accounts;
}

async function publishMediaToInstagram({ igUserId, pageAccessToken, kind = 'Reel', mediaUrl, caption = '', coverUrl = '' }) {
  if (!mediaUrl || mediaUrl.startsWith('blob:')) {
    const err = new Error(
      'Publishing to Instagram requires a publicly accessible HTTPS media URL (local blob URLs cannot be fetched by Meta servers).'
    );
    err.statusCode = 400;
    throw err;
  }

  const base = graphBaseUrl();
  const containerParams = new URLSearchParams({
    access_token: pageAccessToken,
    caption,
  });

  if (kind === 'Post') {
    containerParams.set('image_url', mediaUrl);
  } else {
    containerParams.set('media_type', 'REELS');
    containerParams.set('video_url', mediaUrl);
    if (coverUrl && coverUrl.startsWith('https://')) {
      containerParams.set('cover_url', coverUrl);
    }
  }

  const containerRes = await fetchGraphJson(`${base}/${igUserId}/media?${containerParams.toString()}`, {
    method: 'POST',
  });

  const creationId = containerRes.id;
  if (!creationId) {
    throw new Error('Meta API did not return a media container creation ID.');
  }

  // Wait for video container processing if Reel
  if (kind !== 'Post') {
    let isFinished = false;
    let lastStatus = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const statusRes = await fetchGraphJson(
        `${base}/${creationId}?fields=status_code&access_token=${encodeURIComponent(pageAccessToken)}`
      );
      lastStatus = statusRes.status_code;
      if (statusRes.status_code === 'FINISHED') {
        isFinished = true;
        break;
      }
      if (statusRes.status_code === 'ERROR') {
        const err = new Error('Instagram media container processing failed on Meta servers.');
        err.code = 'CONTAINER_ERROR';
        throw err;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!isFinished) {
      const err = new Error(
        `Instagram media container is still processing on Meta (${lastStatus || 'IN_PROGRESS'}). Please retry in a moment.`
      );
      err.code = 'CONTAINER_STILL_PROCESSING';
      err.retryable = true;
      throw err;
    }
  }

  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: pageAccessToken,
  });

  const publishRes = await fetchGraphJson(
    `${base}/${igUserId}/media_publish?${publishParams.toString()}`,
    { method: 'POST' }
  );

  return {
    creationId,
    publishedMediaId: publishRes.id,
  };
}

module.exports = {
  exchangeCodeForLongLivedToken,
  fetchConnectedInstagramAccounts,
  publishMediaToInstagram,
};

