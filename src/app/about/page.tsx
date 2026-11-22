import type { Metadata } from 'next'
import AboutContent from './AboutContent'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Gawe is a free, open-source, offline-first developer toolbox. No accounts, no data collection, no internet required.',
}

export default function AboutPage() {
  return <AboutContent />
}
