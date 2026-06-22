import { CATEGORIES } from '@/config/tools'
import { CategoryCard } from '@/components/dashboard/CategoryCard'

export default function HomePage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">gawe.app</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          47 offline tools for developers and productivity — no internet required.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  )
}
