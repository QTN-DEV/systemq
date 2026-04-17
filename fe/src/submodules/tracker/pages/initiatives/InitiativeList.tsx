import { type ReactElement, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { StatusBadge } from '../../components/StatusBadge'
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Initiatives</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Planning buckets under products</p>
        </div>
        <Button onClick={() => setOpen(true)}>New Initiative</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {filterProductId ? `Initiatives — ${productMap[filterProductId] ?? filterProductId}` : 'All Initiatives'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : initiatives.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No initiatives yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Target Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initiatives.map((i) => (
                  <TableRow
                    key={i.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/tracker/initiatives/${i.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{i.key}</TableCell>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{productMap[i.product_id] ?? i.product_id}</TableCell>
                    <TableCell><StatusBadge status={i.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{i.target_date ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Initiative</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Input placeholder="e.g. INIT-01" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Initiative name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createInitiative.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
