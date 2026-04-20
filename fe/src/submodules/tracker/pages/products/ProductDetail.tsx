import { type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, MoreHorizontal, Plus, Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PageLayout } from '../../components/PageLayout'
import { StatusIcon } from '../../components/IssueIcons'
import { useInitiativeProjects } from '../../hooks/useInitiativeProjects'
import { useProduct } from '../../hooks/useProducts'

export default function ProductDetail(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: product, isLoading } = useProduct(id!)
  const { data: projects = [] } = useInitiativeProjects(id)

  if (isLoading) return (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground animate-pulse">
      Loading product details…
    </div>
  )

  if (!product) return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4 text-destructive">
        <ChevronLeft className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold">Product not found</h3>
      <p className="text-sm text-muted-foreground mt-1">The product you are looking for does not exist or has been removed.</p>
      <Button variant="outline" size="sm" onClick={() => navigate('/tracker/products')} className="mt-6">
        Back to Products
      </Button>
    </div>
  )

  const breadcrumbs = [
    { label: 'Tracker', href: '/tracker/products' },
    { label: 'Products', href: '/tracker/products' },
    { label: product.key }
  ]

  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
        <Settings className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
        <MoreHorizontal className="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        className="h-8 gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        onClick={() => navigate(`/tracker/initiative-projects?product_id=${id}`)}
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New Project</span>
      </Button>
    </div>
  )

  return (
    <PageLayout breadcrumbs={breadcrumbs} actions={actions}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Hero Section */}
        <div className="px-8 py-8 border-b bg-muted/5">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <StatusIcon status={product.status} className="w-5 h-5" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{product.key}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{product.name}</h1>
            {product.description && (
              <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
                {product.description}
              </p>
            )}

            <div className="flex items-center gap-6 mt-8 text-xs font-medium text-muted-foreground uppercase tracking-widest">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground/60">Status</span>
                <span className="text-foreground capitalize">{product.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground/60">Target Date</span>
                <span className="text-foreground">{product.target_date ?? 'No target date'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground/60">Projects</span>
                <span className="text-foreground">{projects.length} Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto py-8 px-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Active Projects</h2>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => navigate(`/tracker/initiative-projects?product_id=${id}`)}>
                View all
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden divide-y divide-border/50 bg-card/30">
              {projects.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-sm text-muted-foreground">No projects found for this product.</p>
                  <Button variant="link" size="sm" className="mt-2 text-primary" onClick={() => navigate(`/tracker/initiative-projects?product_id=${id}`)}>
                    Create your first project
                  </Button>
                </div>
              ) : (
                projects.map((p) => (
                  <div
                    key={p.id}
                    className="group flex items-center px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/tracker/initiative-projects/${p.id}`)}
                  >
                    <div className="w-16 font-mono text-[11px] text-muted-foreground group-hover:text-foreground">
                      {p.key}
                    </div>
                    <div className="flex-1 text-sm font-medium tracking-tight">
                      {p.name}
                    </div>
                    <div className="w-32 flex items-center gap-2">
                      <StatusIcon status={p.status} />
                      <span className="text-xs text-muted-foreground capitalize">{p.status.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
