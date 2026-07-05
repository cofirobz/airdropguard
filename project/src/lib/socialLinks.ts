import { Instagram, MessageCircle, Music2, Send, Twitter } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type SocialLink = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

export const SOCIAL_LINKS: SocialLink[] = [
  { href: 'https://x.com/Dropguardai', label: 'X', Icon: Twitter },
  { href: 'https://discord.gg/uDP9xm6Dv', label: 'Discord', Icon: MessageCircle },
  { href: 'https://t.me/+yKvXlsatqKs0M2M0', label: 'Telegram', Icon: Send },
  { href: 'https://www.tiktok.com/@airdropguard1?_r=1&_t=ZN-979TcOID05e', label: 'TikTok', Icon: Music2 },
  { href: 'https://www.instagram.com/airdropguard?igsh=bTl2Y3kwbXVoc3h4', label: 'Instagram', Icon: Instagram },
];
