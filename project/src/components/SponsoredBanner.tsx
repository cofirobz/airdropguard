import { useEffect, useState } from 'react';

type SponsorshipLabel = 'Sponsored' | 'Advertisement';

export interface SponsoredBannerData {
	active: boolean;
	advertiserName: string;
	destinationUrl: string;
	ctaText: string;
	label?: SponsorshipLabel;
	imageUrl?: string;
	altText?: string;
}

interface SponsoredBannerProps {
	banner?: Partial<SponsoredBannerData> | null;
	compact?: boolean;
	className?: string;
}

const PLACEHOLDER_BG = 'bg-[linear-gradient(145deg,rgba(8,145,178,0.18),rgba(8,14,26,0.95))]';

function isValidHttpUrl(value: string): boolean {
	try {
		const parsed = new URL(value);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}

export function SponsoredBanner({ banner, compact = false, className = '' }: SponsoredBannerProps) {
	const [imageFailed, setImageFailed] = useState(false);
	const normalizedBanner: SponsoredBannerData = {
		active: Boolean(banner?.active),
		advertiserName: String(banner?.advertiserName ?? 'Sponsored placement'),
		destinationUrl: String(banner?.destinationUrl ?? '').trim(),
		ctaText: String(banner?.ctaText ?? 'Visit sponsor'),
		label: banner?.label === 'Advertisement' ? 'Advertisement' : 'Sponsored',
		imageUrl: String(banner?.imageUrl ?? '').trim() || undefined,
		altText: String(banner?.altText ?? '').trim() || undefined,
	};
	const hasImage = Boolean(normalizedBanner.imageUrl) && isValidHttpUrl(normalizedBanner.imageUrl ?? '') && !imageFailed;
	const hasDestination = isValidHttpUrl(normalizedBanner.destinationUrl);

	useEffect(() => {
		setImageFailed(false);
	}, [normalizedBanner.imageUrl]);

	if (!normalizedBanner.active) return null;

	return (
		<aside className={`rounded-2xl border border-cyan-500/20 ${PLACEHOLDER_BG} p-3 sm:p-4 ${className}`.trim()}>
			<div className="flex items-center justify-between gap-2 mb-2">
				<span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
					{normalizedBanner.label}
				</span>
				<span className="text-[10px] text-cyan-100/80">{normalizedBanner.advertiserName}</span>
			</div>

			<div className={`overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] ${compact ? 'h-16' : 'h-24 sm:h-28'}`}>
				{hasImage ? (
					<img
						src={normalizedBanner.imageUrl}
						alt={normalizedBanner.altText || `${normalizedBanner.advertiserName} banner`}
						className="h-full w-full object-cover"
						onError={(event) => {
							event.currentTarget.onerror = null;
							setImageFailed(true);
						}}
					/>
				) : (
					<div className="h-full w-full flex items-center justify-center text-[11px] text-gray-400">Banner visual placeholder</div>
				)}
			</div>

			<div className="mt-3 flex items-center justify-between gap-2">
				<p className="truncate text-xs sm:text-sm font-semibold text-white">{normalizedBanner.advertiserName}</p>
				{hasDestination ? (
					<a
						href={normalizedBanner.destinationUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200 hover:bg-cyan-400/20 transition-colors"
					>
						{normalizedBanner.ctaText}
					</a>
				) : (
					<span className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-gray-400">
						{normalizedBanner.ctaText}
					</span>
				)}
			</div>

			<p className="mt-1 truncate text-[10px] text-gray-400">{normalizedBanner.destinationUrl || 'https://example.com'}</p>
		</aside>
	);
}

export function HomepageHeroBannerSlot({ banner }: { banner?: SponsoredBannerData }) {
	const fallback: SponsoredBannerData = {
		active: false,
		advertiserName: 'Hero Advertiser',
		destinationUrl: 'https://example.com/hero',
		ctaText: 'Visit Sponsor',
		label: 'Sponsored',
		altText: 'Homepage hero sponsored banner',
	};
	return <SponsoredBanner banner={banner ?? fallback} className="mb-6" />;
}

export function HomepageMidBannerSlot({ banner }: { banner?: SponsoredBannerData }) {
	const fallback: SponsoredBannerData = {
		active: false,
		advertiserName: 'Mid-Page Advertiser',
		destinationUrl: 'https://example.com/mid-page',
		ctaText: 'View sponsor details',
		label: 'Advertisement',
		altText: 'Homepage mid-page advertisement slot',
	};
	return <SponsoredBanner banner={banner ?? fallback} className="my-8" />;
}

export function AirdropDetailBannerSlot({ banner }: { banner?: SponsoredBannerData }) {
	const fallback: SponsoredBannerData = {
		active: false,
		advertiserName: 'Detail Page Advertiser',
		destinationUrl: 'https://example.com/detail',
		ctaText: 'Explore Offer',
		label: 'Sponsored',
		altText: 'Airdrop detail sponsored slot',
	};
	return <SponsoredBanner banner={banner ?? fallback} compact />;
}

export function DashboardBannerSlot({ banner }: { banner?: SponsoredBannerData }) {
	const fallback: SponsoredBannerData = {
		active: false,
		advertiserName: 'Dashboard Advertiser',
		destinationUrl: 'https://example.com/dashboard',
		ctaText: 'Open Campaign',
		label: 'Advertisement',
		altText: 'Dashboard sponsored slot',
	};
	return <SponsoredBanner banner={banner ?? fallback} compact className="mb-4" />;
}
