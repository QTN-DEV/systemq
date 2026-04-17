import { type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { StatusBadge } from '../../components/StatusBadge'
import { useInitiatives } from '../../hooks/useInitiatives'
import { useProduct } from '../../hooks/useProducts'

export default function ProductDetail(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: product, isLoading } = useProduct(id!)
  const { data: initiatives = [] } = useInitiatives(id)

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  if (!product) return <div className="p-6 text-sm text-destructive">Product not found.</div>

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate('/tracker/products')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Products
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-mono text-muted-foreground">{product.key}</span>
          </div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          {product.description && (
            <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
          )}
        </div>
        <StatusBadge status={product.status} />
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        {product.target_date && <span>Target: {product.target_date}</span>}
        <span>{initiatives.length} initiative{initiatives.length !== 1 ? 's' : ''}</span>
      </div>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Initiatives</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/tracker/initiatives?product_id=${id}`)}
          >
            View all
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {initiatives.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No initiatives yet.{' '}
              <button
                className="underline"
                onClick={() => navigate(`/tracker/initiatives?product_id=${id}`)}
              >
                Create one
              </button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Target</TableHead>
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
                    <TableCell><StatusBadge status={i.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{i.target_date ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
