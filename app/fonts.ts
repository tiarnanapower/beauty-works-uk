import { DM_Serif_Text, Inter, Mulish, Roboto_Mono } from 'next/font/google';

export const inter = Inter({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-family-inter',
});

export const mulish = Mulish({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-family-mulish',
});

export const dmSerifText = DM_Serif_Text({
  display: 'swap',
  subsets: ['latin'],
  weight: '400',
  variable: '--font-family-dm-serif-text',
});

export const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-family-roboto-mono',
});

export const fonts = [inter, mulish, dmSerifText, robotoMono];
