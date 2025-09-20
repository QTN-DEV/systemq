import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  type Connection,
  type Edge,
  type Node,
  Position,
  BackgroundVariant,
} from '@xyflow/react'
import { useCallback, useMemo, type ReactElement } from 'react'
import '@xyflow/react/dist/style.css'

import mockData from '../data/mockData.json'

interface Employee {
  id: string
  name: string
  email: string
  title: string
  division: string
  level: string
  position: string
  subordinates: string[]
  projects: string[]
  avatar: string
}

interface CustomNodeData {
  employee: Employee
}

// Custom node component for employee cards
function EmployeeNode({ data }: { data: CustomNodeData }): ReactElement {
  const { employee } = data
  
  // Check if this employee has a supervisor (is subordinate to someone)
  const employees = mockData.employees as Employee[]
  const hasSupervisor = employees.some(emp => emp.subordinates.includes(employee.id))
  
  // Get initials from name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Color mapping for different levels
  const getLevelColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'executive':
        return 'border-red-500 bg-red-50'
      case 'director':
      case 'manager':
        return 'border-orange-500 bg-orange-50'
      case 'lead':
      case 'senior':
        return 'border-blue-500 bg-blue-50'
      case 'mid':
        return 'border-green-500 bg-green-50'
      case 'junior':
        return 'border-purple-500 bg-purple-50'
      default:
        return 'border-gray-500 bg-gray-50'
    }
  }

  const getAvatarBgColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'executive':
        return 'bg-red-500'
      case 'director':
      case 'manager':
        return 'bg-orange-500'
      case 'lead':
      case 'senior':
        return 'bg-blue-500'
      case 'mid':
        return 'bg-green-500'
      case 'junior':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className={`rounded-lg shadow-lg border-2 min-w-[200px] max-w-[200px] hover:shadow-xl transition-all duration-200 hover:-translate-y-1 ${getLevelColor(employee.level)}`}>
      {/* Handle for incoming connections (from supervisor) - only show if employee has a supervisor */}
      {hasSupervisor && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: '#3b82f6', width: 12, height: 12, border: 'none' }}
        />
      )}
      
      <div className="p-2">
        <div className="flex items-center space-x-3">
          {/* Avatar on left */}
          <div className="relative flex-shrink-0">
            <img 
              src={employee.avatar} 
              alt={employee.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
              onError={(e) => {
                // Fallback to initials if image fails to load
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const fallback = target.nextElementSibling as HTMLElement
                if (fallback) fallback.style.display = 'flex'
              }}
            />
            <div 
              className={`w-10 h-10 rounded-full ${getAvatarBgColor(employee.level)} flex items-center justify-center text-white text-xs font-bold shadow-sm hidden`}
            >
              {getInitials(employee.name)}
            </div>
          </div>
          
          {/* Name and role info on right */}
          <div className="flex-1 min-w-0">
            {/* Name on top */}
            <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{employee.name}</h3>
            {/* Role + Division on bottom */}
            <p className="text-xs text-gray-600 leading-tight truncate">{employee.title} • {employee.division}</p>
          </div>
        </div>
      </div>
      
      {/* Handle for outgoing connections (to subordinates) */}
      {employee.subordinates.length > 0 && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ background: '#3b82f6', width: 12, height: 12, border: 'none' }}
        />
      )}
    </div>
  )
}

const nodeTypes = {
  employee: EmployeeNode,
}

interface OrganizationChartProps {
  className?: string
}

export default function OrganizationChart({ className = '' }: OrganizationChartProps): ReactElement {
  const employees = mockData.employees as Employee[]

  // Create nodes and edges from employee data
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []
    
    // Build hierarchy tree structure
    const employeeMap = new Map<string, Employee>()
    const rootEmployees: Employee[] = []
    
    // Create employee map
    employees.forEach(employee => {
      employeeMap.set(employee.id, employee)
    })
    
    // Find root employees (those who are not subordinates of anyone)
    employees.forEach(employee => {
      const isSubordinate = employees.some(emp => emp.subordinates.includes(employee.id))
      if (!isSubordinate) {
        rootEmployees.push(employee)
      }
    })

    // Recursive function to calculate subtree width
    const calculateSubtreeWidth = (employeeId: string): number => {
      const employee = employeeMap.get(employeeId)
      if (!employee || employee.subordinates.length === 0) {
        return 220 // Node width + padding (200px + 20px)
      }
      
      const childWidths = employee.subordinates.map(subId => calculateSubtreeWidth(subId))
      return Math.max(220, childWidths.reduce((sum, width) => sum + width, 0))
    }

    // Recursive function to position nodes
    const positionNodes = (employeeId: string, x: number, y: number, _availableWidth: number): void => {
      const employee = employeeMap.get(employeeId)
      if (!employee) return

      // Position current node
      nodes.push({
        id: employee.id,
        type: 'employee',
        position: { x: x - 100, y }, // Center the node (200px width / 2 = 100)
        data: { employee },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      })

      // Position subordinates
      if (employee.subordinates.length > 0) {
        const childY = y + 140 // Vertical spacing between levels
        const subordinateWidths = employee.subordinates.map(subId => calculateSubtreeWidth(subId))
        const totalChildWidth = subordinateWidths.reduce((sum, width) => sum + width, 0)
        
        let currentX = x - totalChildWidth / 2
        
        employee.subordinates.forEach((subId, index) => {
          const childWidth = subordinateWidths[index]
          const childCenterX = currentX + childWidth / 2
          
          positionNodes(subId, childCenterX, childY, childWidth)
          currentX += childWidth
        })
      }
    }

    // Position all root employees and their subtrees
    let totalRootWidth = 0
    const rootWidths = rootEmployees.map(emp => calculateSubtreeWidth(emp.id))
    totalRootWidth = rootWidths.reduce((sum, width) => sum + width, 0)
    
    let currentRootX = -totalRootWidth / 2
    rootEmployees.forEach((rootEmployee, index) => {
      const rootWidth = rootWidths[index]
      const rootCenterX = currentRootX + rootWidth / 2
      
      positionNodes(rootEmployee.id, rootCenterX, 0, rootWidth)
      currentRootX += rootWidth
    })

    // Create edges based on subordinate relationships
    employees.forEach(employee => {
      employee.subordinates.forEach(subordinateId => {
        edges.push({
          id: `${employee.id}-${subordinateId}`,
          source: employee.id,
          target: subordinateId,
          style: {
            stroke: '#3b82f6',
            strokeWidth: 3,
          },
        })
      })
    })

    return { nodes, edges }
  }, [employees])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  return (
    <div className={`h-full w-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.1,
          includeHiddenNodes: false,
        }}
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        edgesFocusable={false}
        nodesFocusable={false}
        draggable={false}
      >
        <Controls 
          className="bg-white shadow-lg border border-gray-200 rounded-lg" 
          showInteractive={false}
        />
        <MiniMap 
          className="bg-white shadow-lg border border-gray-200 rounded-lg"
          nodeColor={(node) => {
            const data = node.data as Partial<CustomNodeData>;
            if (!data.employee) return '#6b7280';
            const employee = data.employee;
            switch (employee.level.toLowerCase()) {
              case 'executive': return '#ef4444'
              case 'director':
              case 'manager': return '#f97316'
              case 'lead':
              case 'senior': return '#3b82f6'
              case 'mid': return '#10b981'
              case 'junior': return '#8b5cf6'
              default: return '#6b7280'
            }
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
        />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="#e5e7eb"
        />
      </ReactFlow>
    </div>
  )
}
