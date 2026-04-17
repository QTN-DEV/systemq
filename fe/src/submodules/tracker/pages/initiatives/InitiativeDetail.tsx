import { type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { StatusBadge } from '../../components/StatusBadge'
import { useInitiative } from '../../hooks/useInitiatives'
import { useInitiativeProjects } from '../../hooks/useInitiativeProjects'
import { useProduct } from '../../hooks/useProducts'

export default function InitiativeDetail(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: initiative, isLoading } = useInitiative(id!)
  const { data: projects = [] } = useInitiativeProjects(id)
  const { data: product } = useProduct(initiative?.product_id ?? '')

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  if (!initiative) return <div className="p-6 text-sm text-destructive">Initiative not found.</div>

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
            <button onClick={() => navigate('/tracker/products')} className="hover:text-foreground">Products</button>
            <span>/</span>
            <button onClick={() => navigate(`/tracker/products/${initiative.product_id}`)} className="hover:text-foreground">
              {product?.name ?? initiative.product_id}
            </button>
            <span>/</span>
            <span className="font-mono">{initiative.key}</span>
          </div>
          <h1 className="text-2xl font-semibold">{initiative.name}</h1>
          {initiative.description && (
            <p className="text-sm text-muted-foreground mt-1">{initiative.description}</p>
          )}
        </div>
        <StatusBadge status={initiative.status} />
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        {initiative.target_date && <span>Target: {initiative.target_date}</span>}
        <span>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
      </div>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Projects</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/tracker/initiative-projects?initiative_id=${id}`)}
          >
            View all
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {projects.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No projects yet.{' '}
              <button
                className="underline"
                onClick={() => navigate(`/tracker/initiative-projects?initiative_id=${id}`)}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/tracker/initiative-projects/${p.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.key}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
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
