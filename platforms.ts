// All platforms are MANUAL. Signal Folio does not post anywhere.
export interface PlatformInfo {
  id: string;
  name: string;
  desc: string;
  utmMedium: string;
}

export const PLATFORMS: PlatformInfo[] = [
  { id: "own-site", name: "My website / blog", desc: "A site you control", utmMedium: "web" },
  { id: "medium", name: "Medium", desc: "Long-form articles", utmMedium: "article" },
  { id: "devto", name: "Dev.to", desc: "Developer community", utmMedium: "article" },
  { id: "hashnode", name: "Hashnode", desc: "Tech blogging", utmMedium: "article" },
  { id: "linkedin", name: "LinkedIn", desc: "Professional network", utmMedium: "social" },
  { id: "x", name: "X (Twitter)", desc: "Short posts and threads", utmMedium: "social" },
  { id: "youtube", name: "YouTube", desc: "Video", utmMedium: "video" },
  { id: "tiktok", name: "TikTok", desc: "Short video", utmMedium: "video" },
  { id: "newsletter", name: "Newsletter", desc: "Email", utmMedium: "email" },
  { id: "other", name: "Other", desc: "Anywhere else", utmMedium: "referral" },
];

export function platformInfo(id: string): PlatformInfo | undefined {
  return PLATFORMS.find((p) => p.id === id);
}

export function platformName(id: string): string {
  return platformInfo(id)?.name ?? id;
}
