import Image from 'next/image'
import { CATEGORIES } from '@/config/tools'
import { CategoryCard } from '@/components/dashboard/CategoryCard'
import { LogoImage } from '@/components/shell/LogoImage'

export default function HomePage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <LogoImage size={48} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gawe</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            50+ offline tools for developers and productivity — no internet required.
          </p>
          <p className="text-muted-foreground mt-0.5 text-sm">
            No data is sent to any server. All tools and processing runs entirely in your browser, for free, forever.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  )
}
