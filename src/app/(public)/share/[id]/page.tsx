import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SharePageClient } from './client';

interface SharePageProps {
  params: Promise<{ id: string }>;
}

// OGP Metadata Generation
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params;

  const card = await prisma.card.findUnique({
    where: { id },
    select: {
      keyword: true,
      flavorText: true,
      cardImageUrl: true,
    },
  });

  if (!card) {
    return {
      title: 'カードが見つかりません | Articard',
    };
  }

  const title = `「${card.keyword}」のカード | Articard`;
  const description = card.flavorText;

  return {
    title,
    description,
    openGraph: {
      title: `「${card.keyword}」のカード`,
      description,
      images: [
        {
          url: card.cardImageUrl,
          width: 512,
          height: 768,
          alt: card.keyword,
        },
      ],
      type: 'article',
      siteName: 'Articard',
    },
    twitter: {
      card: 'summary_large_image',
      title: `「${card.keyword}」のカード`,
      description,
      images: [card.cardImageUrl],
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;

  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          nickname: true,
        },
      },
    },
  });

  if (!card) {
    notFound();
  }

  const shareCardData = {
    id: card.id,
    keyword: card.keyword,
    rarity: card.rarity,
    flavorText: card.flavorText,
    cardImageUrl: card.cardImageUrl,
    createdAt: card.createdAt.toISOString(),
    owner: {
      nickname: card.user.nickname,
    },
  };

  return <SharePageClient card={shareCardData} />;
}
