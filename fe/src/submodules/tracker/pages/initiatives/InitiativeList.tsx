import { type ReactElement, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Filter } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { PageLayout } from '../../components/PageLayout'
import { StatusIcon } from '../../components/IssueIcons'
import { useCreateInitiative, useInitiatives } from '../../hooks/useInitiatives'
import { useProducts } from '../../hooks/useProducts'

export default function InitiativeList(): ReactElement {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const filterProductId = searchParams.get('product_id') ?? undefined

  const { data: initiatives = [], isLoading } = useInitiatives(filterProductId)
  const { data: products = [] } = useProducts()
  const createInitiative = useCreateInitiative()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ product_id: filterProductId ?? '', key: '', name: '', description: '' })

  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]))

  const handleCreate = async () => {
    if (!form.product_id || !form.key.trim() || !form.name.trim()) {
      toast.error('Product, key, and name are required')
      return
    }
    try {
      await createInitiative.mutateAsync({
        product_id: form.product_id,
        key: form.key.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
      })
      toast.success('Initiative created')
      setOpen(false)
      setForm({ product_id: filterProductId ?? '', key: '', name: '', description: '' })
    } catch {
      toast.error('Failed to create initiative')
    }
  }

  const breadcrumbs = [
    { label: 'Tracker', href: '/tracker/products' },
    { label: 'Initiatives' }
  ]

  if (filterProductId && productMap[filterProductId]) {
    breadcrumbs.push({ label: productMap[filterProductId] })
  }

  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-3 text-muted-foreground hover:text-foreground">
        <Filter className="w-3.5 h-3.5" />
        <span>Filter</span>
      </Button>
      <Button 
        size="sm" 
        onClick={() => setOpen(true)} 
        className="h-8 gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New Initiative</span>
      </Button>
    </div>
  )

  return (
    <PageLayout breadcrumbs={breadcrumbs} actions={actions}>
      <div className="flex flex-col">
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="w-16">Key</div>
          <div className="flex-1">Name</div>
          <div className="w-48">Product</div>
          <div className="w-32">Status</div>
          <div className="w-32">Target Date</div>
        </div>

        {isLoading ? (
          <div className="p-8 text-sm text-muted-foreground flex items-center justify-center">
            <div className="animate-pulse">Loading initiatives…</div>
          </div>
        ) : initiatives.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
             <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
               <Plus className="w-6 h-6" />
             </div>
             <h3 className="text-base font-medium">No initiatives found</h3>
             <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
               Create your first initiative to start organizing projects and tasks.
             </p>
             <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="mt-6 h-8">
               Create Initiative
             </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {initiatives.map((i) => (
              <div
                key={i.id}
                className="group flex items-center px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/tracker/initiatives/${i.id}`)}
              >
                <div className="w-16 font-mono text-[11px] text-muted-foreground group-hover:text-foreground">
                  {i.key}
                </div>
                <div className="flex-1 text-sm font-medium tracking-tight">
                  {i.name}
                </div>
                <div className="w-48 text-xs text-muted-foreground truncate pr-4">
                  {productMap[i.product_id] ?? i.product_id}
                </div>
                <div className="w-32 flex items-center gap-2">
                  <StatusIcon status={i.status} />
                  <span className="text-xs text-muted-foreground capitalize">{i.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="w-32 text-xs text-muted-foreground">
                  {i.target_date ?? 'No target date'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base">Create new initiative</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</Label>
              <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                <SelectTrigger className="h-9 border-muted-foreground/20">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key</Label>
              <Input 
                placeholder="e.g. INIT-01" 
                value={form.key} 
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                className="h-9 focus-visible:ring-1 focus-visible:ring-ring border-muted-foreground/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</Label>
              <Input 
                placeholder="Initiative name" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 focus-visible:ring-1 focus-visible:ring-ring border-muted-foreground/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
              <Input 
                placeholder="Optional description" 
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-9 focus-visible:ring-1 focus-visible:ring-ring border-muted-foreground/20"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-8">Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={createInitiative.isPending} className="h-8">
              Create Initiative
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
