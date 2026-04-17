import { type ReactElement, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { StatusBadge } from '../../components/StatusBadge'
import { useCreateProduct, useProducts } from '../../hooks/useProducts'

export default function ProductList(): ReactElement {
  const navigate = useNavigate()
  const { data: products = [], isLoading } = useProducts()
  const createProduct = useCreateProduct()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ key: '', name: '', description: '' })

  const handleCreate = async () => {
    if (!form.key.trim() || !form.name.trim()) {
      toast.error('Key and name are required')
      return
    }
    try {
      await createProduct.mutateAsync({
        key: form.key.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
      })
      toast.success('Product created')
      setOpen(false)
      setForm({ key: '', name: '', description: '' })
    } catch {
      toast.error('Failed to create product')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Top-level portfolio groups</p>
        </div>
        <Button onClick={() => setOpen(true)}>New Product</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">All Products</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : products.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No products yet. Create one to get started.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Target Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/tracker/products/${p.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.key}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.target_date ?? '—'}</TableCell>
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
            <DialogTitle>New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Input placeholder="e.g. CORE" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createProduct.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
