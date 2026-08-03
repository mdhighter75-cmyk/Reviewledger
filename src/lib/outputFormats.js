// Central registry of every content format the pipeline can produce.
// Shared between the frontend (src) and the serverless API (api/generate.js),
// so both sides agree on ids, folders, and grouping.

export const OUTPUT_GROUPS = [
  {
    id: "longform",
    label: "Long-Form",
    agent: "Long-Form Writer",
    folder: "long-form",
    outputs: [
      { id: "blog", label: "Blog / Article", ext: "md" },
      { id: "newsletter", label: "Newsletter", ext: "md" },
      { id: "product_description", label: "Product Description", ext: "md" },
      { id: "landing_page", label: "Landing-Page Copy", ext: "md" },
    ],
  },
  {
    id: "social",
    label: "Social Media",
    agent: "Social Media Creator",
    folder: "social",
    outputs: [
      { id: "facebook", label: "Facebook Posts", ext: "md" },
      { id: "instagram", label: "Instagram Captions", ext: "md" },
      { id: "linkedin", label: "LinkedIn Posts", ext: "md" },
      { id: "twitter", label: "X / Twitter Posts", ext: "md" },
      { id: "hashtags", label: "Hashtags", ext: "md" },
    ],
  },
  {
    id: "shortvideo",
    label: "Short-Form Video",
    agent: "Short-Form Video Writer",
    folder: "video",
    outputs: [
      { id: "tiktok", label: "TikTok Script", ext: "md" },
      { id: "reels", label: "Instagram Reel Script", ext: "md" },
      { id: "shorts", label: "YouTube Shorts Script", ext: "md" },
    ],
  },
  {
    id: "youtube",
    label: "YouTube",
    agent: "YouTube Writer",
    folder: "video",
    outputs: [
      { id: "yt_script", label: "Full YouTube Script", ext: "md" },
      { id: "yt_description", label: "YouTube Description", ext: "md" },
    ],
  },
  {
    id: "email",
    label: "Email",
    agent: "Email Creator",
    folder: "email",
    outputs: [
      { id: "email_campaign", label: "Email Campaign", ext: "md" },
      { id: "sales_email", label: "Sales Email", ext: "md" },
    ],
  },
  {
    id: "ads",
    label: "Ad Copy",
    agent: "Ad Copy Creator",
    folder: "ads",
    outputs: [{ id: "ad_copy", label: "Ad Copy", ext: "md" }],
  },
  {
    id: "seo",
    label: "SEO",
    agent: "SEO Packager",
    folder: "seo",
    outputs: [{ id: "seo", label: "SEO Metadata", ext: "md" }],
  },
  {
    id: "creative",
    label: "Creative Direction",
    agent: "Creative Director",
    folder: "creative",
    outputs: [
      { id: "image_prompts", label: "Image Prompts", ext: "md" },
      { id: "thumbnail_prompts", label: "Thumbnail Prompts", ext: "md" },
    ],
  },
];

// Auto-generated strategy-stage assets that ship alongside the content package
// even though they come from stages 1-2, not a content group.
export const STRATEGY_OUTPUTS = [
  { id: "source_analysis", label: "Source Analysis", folder: "strategy", ext: "md" },
  { id: "content_strategy", label: "Content Strategy", folder: "strategy", ext: "md" },
];

export function findGroup(groupId) {
  return OUTPUT_GROUPS.find((g) => g.id === groupId) || null;
}

export function findOutput(outputId) {
  for (const group of OUTPUT_GROUPS) {
    const found = group.outputs.find((o) => o.id === outputId);
    if (found) return { ...found, group };
  }
  const strategyOutput = STRATEGY_OUTPUTS.find((o) => o.id === outputId);
  if (strategyOutput) return { ...strategyOutput, group: { id: "strategy", label: "Strategy", folder: "strategy" } };
  return null;
}

export function groupForOutputs(selectedOutputIds) {
  return OUTPUT_GROUPS.filter((g) => g.outputs.some((o) => selectedOutputIds.includes(o.id)));
}

export const ALL_OUTPUT_IDS = OUTPUT_GROUPS.flatMap((g) => g.outputs.map((o) => o.id));
