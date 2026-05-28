'use client'

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import '@xyflow/react/dist/style.css'
import { DomainEntity, EntityRelationship, EntityVerdict } from '@/types'

const VERDICT_STYLES: Record<EntityVerdict, { border: string; bg: string; text: string; badge: string; badgeText: string }> = {
  first_class: {
    border: 'border-indigo-400',
    bg: 'bg-white',
    text: 'text-gray-900',
    badge: 'bg-indigo-100 text-indigo-700',
    badgeText: 'first class',
  },
  borderline: {
    border: 'border-amber-400',
    bg: 'bg-white',
    text: 'text-gray-900',
    badge: 'bg-amber-100 text-amber-700',
    badgeText: 'borderline',
  },
  read_model: {
    border: 'border-gray-300',
    bg: 'bg-gray-50',
    text: 'text-gray-400',
    badge: 'bg-gray-100 text-gray-400',
    badgeText: 'read model',
  },
  folk_concept: {
    border: 'border-red-300',
    bg: 'bg-red-50',
    text: 'text-red-400',
    badge: 'bg-red-100 text-red-400',
    badgeText: 'folk concept',
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EntityNode({ data }: { data: any }) {
  const entity = data.entity as DomainEntity
  const s = VERDICT_STYLES[entity.verdict]
  const isWeak = entity.verdict === 'read_model' || entity.verdict === 'folk_concept'

  return (
    <div
      onClick={() => data.onSelect(entity)}
      className={`cursor-pointer rounded-xl border-2 px-4 py-3 shadow-sm hover:shadow-md transition-shadow min-w-[140px] max-w-[180px] ${s.border} ${s.bg}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-300 !w-2 !h-2" />
      <p className={`text-xs font-semibold text-center ${s.text} ${isWeak ? 'line-through opacity-60' : ''}`}>
        {entity.name}
      </p>
      <div className="flex justify-center mt-1.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.badge}`}>
          {s.badgeText}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-2 !h-2" />
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = { entity: EntityNode }

function layoutGraph(entities: DomainEntity[], relationships: EntityRelationship[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 })

  entities.forEach(e => g.setNode(e.id, { width: 180, height: 72 }))
  relationships.forEach(r => {
    if (entities.find(e => e.id === r.from) && entities.find(e => e.id === r.to)) {
      g.setEdge(r.from, r.to)
    }
  })

  dagre.layout(g)

  return entities.map(e => {
    const pos = g.node(e.id)
    return { id: e.id, x: pos ? pos.x - 90 : 0, y: pos ? pos.y - 36 : 0 }
  })
}

interface Props {
  entities: DomainEntity[]
  relationships: EntityRelationship[]
  onSelect: (entity: DomainEntity) => void
}

export default function EntityGraph({ entities, relationships, onSelect }: Props) {
  const positions = useMemo(() => layoutGraph(entities, relationships), [entities, relationships])

  const initialNodes: Node[] = useMemo(() => entities.map(e => {
    const pos = positions.find(p => p.id === e.id)!
    return {
      id: e.id,
      type: 'entity',
      position: { x: pos.x, y: pos.y },
      data: { entity: e, onSelect },
    }
  }), [entities, positions, onSelect])

  const initialEdges: Edge[] = useMemo(() => relationships
    .filter(r => entities.find(e => e.id === r.from) && entities.find(e => e.id === r.to))
    .map((r, i) => ({
      id: `e-${i}`,
      source: r.from,
      target: r.to,
      label: r.label,
      labelStyle: { fontSize: 10, fill: '#6b7280' },
      labelBgStyle: { fill: '#f9fafb' },
      labelBgPadding: [4, 2] as [number, number],
      markerEnd: { type: MarkerType.ArrowClosed, color: '#d1d5db' },
      style: { stroke: '#d1d5db' },
    })), [relationships, entities])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const onNodeClick = useCallback(() => {}, [])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.3}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#f3f4f6" gap={20} />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}
