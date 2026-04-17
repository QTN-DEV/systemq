import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Panel,
  ConnectionMode,
  type Connection,
  type Edge,
  type Node,
  Position,
  BackgroundVariant,
} from "@xyflow/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import "@xyflow/react/dist/style.css";

import {
  getEmployees,
  saveChart,
  type EmployeeListItem as BaseEmployeeListItem,
} from "@/lib/shared/services/EmployeeService";
import {
  EmployeeFormSheet,
  type EmployeeFormValues,
} from "@/pages/employee-management/_forms/EmployeeFormSheet";

// Extended type to include projects array and division
interface EmployeeListItem extends BaseEmployeeListItem {
  projects?: string[];
  division?: string;
}

interface CustomNodeData {
  employee: EmployeeListItem;
  hasSupervisor: boolean;
  isClone?: boolean;
  projectName?: string;
  onRemoveProject?: (empId: string, projectName: string) => void;
  onDivisionClick?: (division: string) => void; // NEW: Callback for clicking the division badge
  // Search/highlight flags driven by the top-right name search box.
  isHighlighted?: boolean;
  isDimmed?: boolean;
}

// 1. Custom node component for employee cards
function EmployeeNode({ data }: { data: CustomNodeData }): ReactElement {
  const {
    employee,
    isClone,
    projectName,
    onRemoveProject,
    onDivisionClick,
    isHighlighted,
    isDimmed,
  } = data;
  const hasSupervisor = data.hasSupervisor;

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPositionClasses = (
    position: string | undefined,
  ): { card: string; avatar: string } => {
    switch (position) {
      case "Admin":
        return { card: "border-red-500 bg-red-50", avatar: "bg-red-500" };
      case "CEO":
        return {
          card: "border-purple-500 bg-purple-50",
          avatar: "bg-purple-500",
        };
      case "Internal Ops":
        return { card: "border-blue-500 bg-blue-50", avatar: "bg-blue-500" };
      case "Div Lead":
        return { card: "border-green-500 bg-green-50", avatar: "bg-green-500" };
      case "PM":
        return { card: "border-pink-500 bg-pink-50", avatar: "bg-pink-500" };
      case "Team Member":
        return { card: "border-gray-500 bg-gray-50", avatar: "bg-gray-500" };
      default:
        return { card: "border-gray-500 bg-gray-50", avatar: "bg-gray-500" };
    }
  };

  const { card, avatar } = getPositionClasses(
    employee.position as unknown as string,
  );

  // Styling hooks for the name-search highlight.
  // - Highlighted cards get a bright yellow ring + subtle scale.
  // - Non-matching cards (when a search is active) fade out.
  const highlightClasses = isHighlighted
    ? "ring-4 ring-yellow-400 ring-offset-2 scale-[1.05] shadow-2xl z-10"
    : "";
  const dimClasses = isDimmed ? "opacity-25 grayscale" : "";

  return (
    <div
      className={`rounded-lg shadow-lg border-2 min-w-[200px] max-w-[200px] hover:shadow-xl transition-all duration-200 hover:-translate-y-1 bg-white cursor-grab active:cursor-grabbing relative ${card} ${isClone ? "border-dashed opacity-95" : ""} ${highlightClasses} ${dimClasses}`}
    >
      {/* ---------------- DIVISION BADGE (Now Clickable) ---------------- */}
      {employee.division && (
        <div
          onClick={(e) => {
            if (onDivisionClick) {
              e.stopPropagation(); // Don't trigger the employee click
              onDivisionClick(employee.division as string);
            }
          }}
          className="absolute -top-3 -left-3 bg-slate-800 hover:bg-slate-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md border border-white z-20 pointer-events-auto cursor-pointer transition-colors tracking-wide whitespace-nowrap"
          title={`Filter chart to show only ${employee.division} division`}
        >
          {employee.division}
        </div>
      )}

      {/* Remove from project 'X' button */}
      {isClone && onRemoveProject && projectName && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveProject(employee.id, projectName);
          }}
          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shadow border-2 border-white z-10 transition-colors pointer-events-auto"
          title={`Remove from ${projectName}`}
        >
          ×
        </button>
      )}

      {/* 4-sided connection handles (each side has source + target stacked
          so the user can drag a connection from any direction). In clones
          inside project groups we still hide the handles. */}
      {!isClone &&
        (
          [
            { id: "top", position: Position.Top },
            { id: "right", position: Position.Right },
            { id: "bottom", position: Position.Bottom },
            { id: "left", position: Position.Left },
          ] as const
        ).map(({ id, position }) => {
          const baseStyle = {
            background: "#3b82f6",
            width: 12,
            height: 12,
            border: "none",
            opacity:
              id === "top" && !hasSupervisor ? 0.5 : 1,
          } as const;
          return (
            <div key={id}>
              <Handle
                id={`${id}-target`}
                type="target"
                position={position}
                style={baseStyle}
              />
              <Handle
                id={`${id}-source`}
                type="source"
                position={position}
                style={baseStyle}
              />
            </div>
          );
        })}

      <div className="p-2 pointer-events-none">
        <div className="flex items-center space-x-3 mt-1">
          <div className="relative flex-shrink-0">
            {employee.avatar ? (
              <img
                src={employee.avatar}
                alt={employee.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className={`w-10 h-10 rounded-full ${avatar} flex items-center justify-center text-white text-xs font-bold shadow-sm ${employee.avatar ? "hidden" : ""}`}
            >
              {getInitials(employee.name || "Unknown")}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">
              {employee.name}
            </h3>
            <p className="text-xs text-gray-600 leading-tight truncate">
              {employee.title ?? ""}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

// 2. Custom node component for Project Group Containers
function ProjectGroupNode({ data }: { data: { name: string } }): ReactElement {
  return (
    <div className="rounded-xl border-4 border-dashed border-orange-400 bg-orange-50/50 h-full w-full relative group shadow-inner cursor-pointer hover:shadow-lg hover:border-orange-500 transition-all duration-200">
      <div className="absolute top-0 left-0 right-0 h-10 bg-orange-100/70 rounded-t-lg flex items-center px-4 border-b-2 border-dashed border-orange-400 group-hover:bg-orange-200/70 transition-colors duration-200 pointer-events-none">
        <span className="text-xs font-bold text-orange-600 uppercase tracking-widest mr-2">
          Project:
        </span>
        <h3 className="font-extrabold text-sm text-gray-900 truncate flex-1">
          {data.name}
        </h3>
      </div>
    </div>
  );
}

// --- Geometry helpers for the polygon overlay --------------------------------

type Pt = { x: number; y: number };

// Andrew's monotone chain convex hull. Returns the hull points in CCW order.
function convexHull(points: Pt[]): Pt[] {
  if (points.length <= 2) return [...points];
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Pt[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Pt[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

// Push each hull point outward from the centroid by `padding` px so the
// polygon has some breathing room around the cards it encloses.
// `extraTop` adds additional vertical padding ONLY to vertices that sit
// above the centroid, giving extra headroom for the label pill so the
// top edge doesn't feel cramped compared to the other sides.
function expandPolygon(
  points: Pt[],
  padding: number,
  extraTop: number = 0,
): Pt[] {
  if (points.length === 0) return points;
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  return points.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return p;
    const expandedY = p.y + (dy / dist) * padding;
    // Upper-half vertices get pushed further up by `extraTop`.
    const finalY = p.y < cy ? expandedY - extraTop : expandedY;
    return {
      x: p.x + (dx / dist) * padding,
      y: finalY,
    };
  });
}

// Palette for polygon groupings. We cycle through in render order so each
// project gets a distinct, consistent color.
const POLYGON_PALETTE = [
  { fill: "rgba(249, 115, 22, 0.14)", stroke: "#f97316" }, // orange
  { fill: "rgba(59, 130, 246, 0.14)", stroke: "#3b82f6" }, // blue
  { fill: "rgba(16, 185, 129, 0.14)", stroke: "#10b981" }, // green
  { fill: "rgba(168, 85, 247, 0.14)", stroke: "#a855f7" }, // purple
  { fill: "rgba(239, 68, 68, 0.14)", stroke: "#ef4444" }, // red
  { fill: "rgba(234, 179, 8, 0.14)", stroke: "#eab308" }, // amber
];

// 2b. SVG polygon overlay for project grouping (used in division view).
function ProjectPolygonNode({
  data,
}: {
  data: {
    name: string;
    points: Pt[];
    width: number;
    height: number;
    colorIndex: number;
  };
}): ReactElement {
  const { fill, stroke } = POLYGON_PALETTE[data.colorIndex % POLYGON_PALETTE.length];
  const d =
    data.points.length === 0
      ? ""
      : `M ${data.points.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;

  // Find the top-most hull vertex (smallest y) to anchor the label.
  const topPoint = data.points.reduce<Pt>(
    (best, p) => (p.y < best.y ? p : best),
    data.points[0] ?? { x: 0, y: 0 },
  );

  // Place the label INSIDE the top padding area of the polygon and
  // horizontally centered within the node's bounding box.
  const labelText = data.name.toUpperCase();
  const labelWidth = Math.max(80, labelText.length * 7 + 24);
  const labelHeight = 22;
  const labelX = Math.max(0, data.width / 2 - labelWidth / 2);
  const labelY = topPoint.y + 10;

  return (
    <div
      style={{
        width: data.width,
        height: data.height,
        pointerEvents: "none",
      }}
    >
      <svg
        width={data.width}
        height={data.height}
        style={{ overflow: "visible" }}
      >
        <path
          d={d}
          fill={fill}
          stroke={stroke}
          strokeWidth={2.5}
          strokeDasharray="8 5"
          strokeLinejoin="round"
        />
        {/* Label pill sits in the extra top-padding zone of the polygon */}
        <rect
          x={labelX}
          y={labelY}
          rx={6}
          ry={6}
          width={labelWidth}
          height={labelHeight}
          fill={stroke}
        />
        <text
          x={labelX + labelWidth / 2}
          y={labelY + labelHeight / 2 + 4}
          fontSize="11"
          fontWeight={700}
          fill="white"
          textAnchor="middle"
          style={{ letterSpacing: "0.04em" }}
        >
          {labelText}
        </text>
      </svg>
    </div>
  );
}

const nodeTypes = {
  employee: EmployeeNode,
  projectGroup: ProjectGroupNode,
  projectPolygon: ProjectPolygonNode,
};

interface OrganizationChartProps {
  className?: string;
}

// 3. Main Chart Component
export default function OrganizationChart({
  className = "",
}: OrganizationChartProps): ReactElement {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);

  // States for Editing Modals & Filtering
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeListItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<EmployeeListItem>>({});
  const [selectedProject, setSelectedProject] = useState<{
    oldName: string;
    newName: string;
  } | null>(null);
  const [activeDivisionFilter, setActiveDivisionFilter] = useState<
    string | null
  >(null); // NEW: Filter state
  // Track projects that exist but have no members yet (empty project boxes)
  const [standaloneProjects, setStandaloneProjects] = useState<string[]>([]);
  // Free-moved nodes (currently only orphan employees) keep their last
  // user-dragged position here, so re-renders of the layout don't snap them
  // back to the tree-computed spot.
  const [customPositions, setCustomPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  // Search term used to highlight matching employees by name. Empty string
  // means no active search and all cards render at full opacity.
  const [highlightQuery, setHighlightQuery] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  // Controls the "Add Employee" sheet (the same dialog used by the
  // employee-management page, for consistency).
  const [addEmployeeSheetOpen, setAddEmployeeSheetOpen] = useState(false);

  // Fetch employees from the backend. No mock overrides: divisions and
  // project assignments are whatever the `users` collection says they are.
  useEffect(() => {
    void (async () => {
      try {
        const data = await getEmployees();
        const normalized: EmployeeListItem[] = data.map((emp) => ({
          ...emp,
          division: emp.division ?? undefined,
          projects: emp.projects ?? [],
        }));
        setEmployees(normalized);
        setHasChanges(false);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (selectedEmployee) setEditForm(selectedEmployee);
  }, [selectedEmployee]);

  const handleRemoveFromProject = useCallback(
    (empId: string, projectName: string) => {
      setEmployees((prev) => {
        let hasChanged = false;
        const updatedEmployees = prev.map((emp) => {
          if (emp.id === empId && emp.projects?.includes(projectName)) {
            hasChanged = true;
            return {
              ...emp,
              projects: emp.projects.filter((p) => p !== projectName),
            };
          }
          return emp;
        });
        if (hasChanged) setHasChanges(true);
        return updatedEmployees;
      });
    },
    [],
  );

  // Compute Tree Layout (NOW REACTS TO DIVISION FILTER)
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // NEW: Apply the division filter to the dataset before processing layout
    const visibleEmployees = activeDivisionFilter
      ? employees.filter((emp) => emp.division === activeDivisionFilter)
      : employees;

    const employeeMap = new Map<string, EmployeeListItem>();
    const rootEmployees: EmployeeListItem[] = [];

    visibleEmployees.forEach((employee) =>
      employeeMap.set(employee.id, employee),
    );

    // Find absolute roots within the FILTERED list.
    // If a manager is filtered out, their subordinates automatically become roots!
    visibleEmployees.forEach((employee) => {
      const isSubordinate = visibleEmployees.some(
        (emp) => emp.subordinates && emp.subordinates.includes(employee.id),
      );
      if (!isSubordinate) rootEmployees.push(employee);
    });

    const calculateSubtreeWidth = (employeeId: string): number => {
      const employee = employeeMap.get(employeeId);
      // Only count subordinates that are also in the filtered view
      const validSubordinates =
        employee?.subordinates?.filter((subId) => employeeMap.has(subId)) || [];

      if (!employee || validSubordinates.length === 0) return 220;
      const childWidths = validSubordinates.map((subId) =>
        calculateSubtreeWidth(subId),
      );
      return Math.max(
        220,
        childWidths.reduce((sum, width) => sum + width, 0),
      );
    };

    let maxTreeY = 0;

    const positionNodes = (
      employeeId: string,
      x: number,
      y: number,
      _availableWidth: number,
      rootId: string,
    ): void => {
      const employee = employeeMap.get(employeeId);
      if (!employee) return;
      if (y > maxTreeY) maxTreeY = y;
      (employee as any).orgX = x;
      (employee as any).orgY = y;
      (employee as any).isRoot = employee.id === rootId;

      const validSubordinates =
        employee.subordinates?.filter((subId) => employeeMap.has(subId)) || [];

      if (validSubordinates.length > 0) {
        const childY = y + 140;
        const subordinateWidths = validSubordinates.map((subId) =>
          calculateSubtreeWidth(subId),
        );
        const totalChildWidth = subordinateWidths.reduce(
          (sum, width) => sum + width,
          0,
        );
        let currentX = x - totalChildWidth / 2;

        validSubordinates.forEach((subId, index) => {
          const childWidth = subordinateWidths[index];
          const childCenterX = currentX + childWidth / 2;
          positionNodes(subId, childCenterX, childY, childWidth, rootId);
          currentX += childWidth;
        });
      }
    };

    let totalRootWidth = 0;
    const rootWidths = rootEmployees.map((emp) =>
      calculateSubtreeWidth(emp.id),
    );
    totalRootWidth = rootWidths.reduce((sum, width) => sum + width, 0);

    let currentRootX = -totalRootWidth / 2;
    rootEmployees.forEach((rootEmployee, index) => {
      const rootWidth = rootWidths[index];
      const rootCenterX = currentRootX + rootWidth / 2;
      positionNodes(
        rootEmployee.id,
        rootCenterX,
        0,
        rootWidth,
        rootEmployee.id,
      );
      currentRootX += rootWidth;
    });

    // Normalized search query (case-insensitive, trimmed). Empty = no active
    // search, so nothing gets highlighted or dimmed.
    const q = highlightQuery.trim().toLowerCase();
    const isMatch = (emp: EmployeeListItem): boolean => {
      if (!q) return false;
      return (emp.name ?? "").toLowerCase().includes(q);
    };

    // --- 1. RENDER ORG CHART ---
    visibleEmployees.forEach((emp) => {
      const safeX =
        typeof (emp as any).orgX === "number" ? (emp as any).orgX : 0;
      const safeY =
        typeof (emp as any).orgY === "number" ? (emp as any).orgY : 0;

      // If the user has freely moved this node AND it is currently an
      // orphan (no supervisor, no subordinates), honour that custom
      // position instead of the tree-computed one so it doesn't snap back.
      // Nodes that later get wired into the hierarchy revert to the tree
      // layout automatically.
      const hasSubs = (emp.subordinates?.length ?? 0) > 0;
      const hasSupervisor = visibleEmployees.some((o) =>
        o.subordinates?.includes(emp.id),
      );
      const isOrphan = !hasSubs && !hasSupervisor;
      const customPos = customPositions[emp.id];
      const nodePosition =
        isOrphan && customPos ? customPos : { x: safeX - 100, y: safeY };

      const highlighted = isMatch(emp);

      nodes.push({
        id: emp.id,
        type: "employee",
        position: nodePosition,
        data: {
          employee: emp,
          hasSupervisor: !(emp as any).isRoot,
          onDivisionClick: setActiveDivisionFilter, // Pass the setter so clicks trigger a filter
          isHighlighted: highlighted,
          isDimmed: q.length > 0 && !highlighted,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      if (emp.subordinates) {
        emp.subordinates.forEach((subordinateId) => {
          // Only draw edge if BOTH nodes exist in the current filtered view
          if (employeeMap.has(subordinateId)) {
            edges.push({
              id: `${emp.id}-${subordinateId}`,
              source: emp.id,
              target: subordinateId,
              // Explicitly attach to bottom of supervisor / top of subordinate.
              // Without these, React Flow picks the first rendered handle
              // (which is "top-*") and the hierarchy lines appear to leave
              // from the top of each card instead of the bottom.
              sourceHandle: "bottom-source",
              targetHandle: "top-target",
              style: { stroke: "#3b82f6", strokeWidth: 3 },
            });
          }
        });
      }
    });

    // --- 2. RENDER MULTIPLE PROJECT BOXES (Filtered View) ---
    const projectEmployeeMap = new Map<string, string[]>();
    visibleEmployees.forEach((emp) => {
      if (emp.projects && emp.projects.length > 0) {
        emp.projects.forEach((proj) => {
          if (!projectEmployeeMap.has(proj)) projectEmployeeMap.set(proj, []);
          projectEmployeeMap.get(proj)!.push(emp.id);
        });
      }
    });

    // Ensure standalone (empty) projects also render as boxes, only when
    // no division filter is active (standalone projects have no division).
    if (!activeDivisionFilter) {
      standaloneProjects.forEach((proj) => {
        if (!projectEmployeeMap.has(proj)) projectEmployeeMap.set(proj, []);
      });
    }

    const uniqueProjects = Array.from(projectEmployeeMap.keys());
    const internalSpacingX = 220;
    // internalSpacingY was 160 which made the vertical gap visually much
    // bigger than the horizontal one (card width ≈ 200, card height ≈ 80).
    // With 100 the row gap (~20 px) roughly matches the column gap.
    const internalSpacingY = 100;
    const headerHeight = 60;
    const internalPadding = 30;
    const projectBaseY = maxTreeY + 300;

    if (uniqueProjects.length > 0) {
      if (activeDivisionFilter) {
        // --- 2a. DIVISION VIEW: render projects as SVG polygon overlays
        // drawn directly on top of the structure chart. We do NOT render
        // the project group boxes below the chart in this mode.
        // Employee cards on the main chart are roughly 200 x 100 px
        // (including their drop shadow). We add generous padding so the
        // polygon doesn't hug the cards too tightly.
        const cardWidth = 200;
        const cardHeight = 100;
        const hullPadding = 72;
        // Extra headroom above the top vertices so the label pill has its
        // own space instead of visually squeezing the top edge.
        const extraTopPadding = 48;

        let colorIndex = 0;
        uniqueProjects.forEach((projName) => {
          const empIdsInProject = projectEmployeeMap.get(projName)!;
          if (empIdsInProject.length === 0) return;

          // Collect all four corners of every member card so even a
          // single-member project produces a valid rectangle hull.
          const cornerPoints: Pt[] = [];
          empIdsInProject.forEach((empId) => {
            const emp = employeeMap.get(empId);
            if (!emp) return;
            const orgX = (emp as any).orgX as number | undefined;
            const orgY = (emp as any).orgY as number | undefined;
            if (typeof orgX !== "number" || typeof orgY !== "number") return;

            // Honour custom positions for orphans so the polygon tracks
            // wherever the user dragged them.
            const custom = customPositions[empId];
            const topLeftX = custom ? custom.x : orgX - 100;
            const topLeftY = custom ? custom.y : orgY;

            cornerPoints.push({ x: topLeftX, y: topLeftY });
            cornerPoints.push({ x: topLeftX + cardWidth, y: topLeftY });
            cornerPoints.push({
              x: topLeftX + cardWidth,
              y: topLeftY + cardHeight,
            });
            cornerPoints.push({ x: topLeftX, y: topLeftY + cardHeight });
          });

          if (cornerPoints.length === 0) return;

          const hull = expandPolygon(
            convexHull(cornerPoints),
            hullPadding,
            extraTopPadding,
          );
          const minX = Math.min(...hull.map((p) => p.x));
          const minY = Math.min(...hull.map((p) => p.y));
          const maxX = Math.max(...hull.map((p) => p.x));
          const maxY = Math.max(...hull.map((p) => p.y));

          // Express hull points relative to the node's top-left (the SVG
          // is positioned at that anchor).
          const relPoints = hull.map((p) => ({
            x: p.x - minX,
            y: p.y - minY,
          }));

          nodes.push({
            id: `polygon-${projName.replace(/\s+/g, "-").toLowerCase()}`,
            type: "projectPolygon",
            position: { x: minX, y: minY },
            data: {
              name: projName,
              points: relPoints,
              width: maxX - minX,
              height: maxY - minY,
              colorIndex,
            },
            draggable: false,
            selectable: false,
            // Put polygons behind employee cards.
            zIndex: -10,
          });
          colorIndex += 1;
        });
      } else {
        // --- 2b. DEFAULT VIEW: render project group boxes below chart.
        const groupHorizontalGap = 80;
        const groupWidthInNodes = 2;
        const fixedGroupWidth =
          groupWidthInNodes * internalSpacingX +
          internalPadding * 2 -
          (internalSpacingX - 200);

        let totalProjectsWidth =
          uniqueProjects.length * (fixedGroupWidth + groupHorizontalGap) -
          groupHorizontalGap;
        let currentGroupX = -(totalProjectsWidth / 2);

        uniqueProjects.forEach((projName) => {
          const empIdsInProject = projectEmployeeMap.get(projName)!;
          const groupId = `group-${projName.replace(/\s+/g, "-").toLowerCase()}`;
          const rowCount = Math.ceil(
            empIdsInProject.length / groupWidthInNodes,
          );
          // Ensure empty projects still have a visible drop-zone area
          const effectiveRowCount = Math.max(rowCount, 1);
          // The last row only needs card height (≈ 80px) at the bottom,
          // so we compensate by subtracting (spacing - lastRowHeight).
          const lastRowHeight = 80;
          const groupHeight =
            headerHeight +
            effectiveRowCount * internalSpacingY +
            internalPadding * 2 -
            (internalSpacingY - lastRowHeight);

          nodes.push({
            id: groupId,
            type: "projectGroup",
            position: { x: currentGroupX, y: projectBaseY },
            style: { width: fixedGroupWidth, height: groupHeight },
            data: { name: projName },
            draggable: true,
          });

          empIdsInProject.forEach((empId, index) => {
            const emp = employeeMap.get(empId)!;
            const gridX =
              (index % groupWidthInNodes) * internalSpacingX + internalPadding;
            const gridY =
              Math.floor(index / groupWidthInNodes) * internalSpacingY +
              headerHeight;

            const cloneHighlighted = isMatch(emp);

            nodes.push({
              id: `${emp.id}-proj-${groupId}`,
              type: "employee",
              parentId: groupId,
              extent: "parent",
              position: { x: gridX, y: gridY },
              data: {
                employee: emp,
                hasSupervisor: false,
                isClone: true,
                projectName: projName,
                onRemoveProject: handleRemoveFromProject,
                isHighlighted: cloneHighlighted,
                isDimmed: q.length > 0 && !cloneHighlighted,
              },
              sourcePosition: Position.Bottom,
              targetPosition: Position.Top,
            });
          });

          currentGroupX += fixedGroupWidth + groupHorizontalGap;
        });
      }
    }

    return { nodes, edges };
  }, [
    employees,
    handleRemoveFromProject,
    activeDivisionFilter,
    standaloneProjects,
    customPositions,
    highlightQuery,
  ]); // Added dependency on filter + custom positions + highlight

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback((params: Connection): void => {
    if (!params.source || !params.target) return;
    if (params.source.includes("-proj-") || params.target.includes("-proj-"))
      return;

    let connectionMade = false;
    setEmployees((prevEmployees) => {
      const newEmployees = prevEmployees.map((emp) => {
        if (
          emp.id === params.source &&
          !emp.subordinates.includes(params.target)
        ) {
          connectionMade = true;
          return { ...emp, subordinates: [...emp.subordinates, params.target] };
        }
        if (
          emp.id !== params.source &&
          emp.subordinates.includes(params.target)
        ) {
          connectionMade = true;
          return {
            ...emp,
            subordinates: emp.subordinates.filter((id) => id !== params.target),
          };
        }
        return emp;
      });
      if (connectionMade) setHasChanges(true);
      return newEmployees;
    });
  }, []);

  const handleNodeDragStop = useCallback(
    (event: React.MouseEvent, draggedNode: Node) => {
      if (draggedNode.type !== "employee") return;

      const isClone = draggedNode.id.includes("-proj-");
      const employeeId = draggedNode.id.split("-proj-")[0];

      const absoluteX =
        draggedNode.positionAbsolute?.x ?? draggedNode.position.x;
      const absoluteY =
        draggedNode.positionAbsolute?.y ?? draggedNode.position.y;
      const draggedCenter = { x: absoluteX + 100, y: absoluteY + 40 };

      const targetGroup = nodes.find((n) => {
        if (n.type !== "projectGroup") return false;

        const groupX = n.position.x;
        const groupY = n.position.y;
        const groupWidth = parseInt(n.style?.width as string) || 0;
        const groupHeight = parseInt(n.style?.height as string) || 0;

        return (
          draggedCenter.x >= groupX &&
          draggedCenter.x <= groupX + groupWidth &&
          draggedCenter.y >= groupY &&
          draggedCenter.y <= groupY + groupHeight
        );
      });

      if (targetGroup) {
        const targetProjectName = targetGroup.data.name as string;

        setEmployees((prev) => {
          let hasChanged = false;
          const updatedEmployees = prev.map((emp) => {
            if (emp.id === employeeId) {
              const currentProjects = emp.projects || [];
              if (currentProjects.includes(targetProjectName)) return emp;
              hasChanged = true;
              return {
                ...emp,
                projects: [...currentProjects, targetProjectName],
              };
            }
            return emp;
          });
          if (hasChanged) setHasChanges(true);
          return updatedEmployees;
        });
      } else {
        if (isClone) {
          const sourceProjectName = draggedNode.data.projectName as string;
          if (sourceProjectName) {
            handleRemoveFromProject(employeeId, sourceProjectName);
          }
        } else {
          // Determine if this is an "orphan" node: not a supervisor of
          // anyone AND not a subordinate of anyone. Orphans may be placed
          // freely on the canvas without snapping back to the auto layout.
          const emp = employees.find((e) => e.id === employeeId);
          const hasNoSubordinates = !emp?.subordinates?.length;
          const isNotSubordinate = !employees.some((e) =>
            e.subordinates?.includes(employeeId),
          );
          const isOrphan = hasNoSubordinates && isNotSubordinate;

          if (isOrphan) {
            // Persist the dragged-to position so future layout rebuilds
            // (e.g. after state changes) won't reset it.
            setCustomPositions((prev) => ({
              ...prev,
              [employeeId]: {
                x: draggedNode.position.x,
                y: draggedNode.position.y,
              },
            }));
          } else {
            // Hierarchical nodes still snap back so the tree stays tidy.
            setNodes([...initialNodes]);
          }
        }
      }
    },
    [nodes, initialNodes, setNodes, handleRemoveFromProject, employees],
  );

  const handleNodeClick = useCallback((_: any, node: Node): void => {
    if (node.type === "employee") {
      const data = node.data as Partial<CustomNodeData>;
      if (data && (data as any).employee)
        setSelectedEmployee((data as any).employee as EmployeeListItem);
    } else if (node.type === "projectGroup") {
      setSelectedProject({
        oldName: node.data.name as string,
        newName: node.data.name as string,
      });
    }
  }, []);

  const handleSaveEmployeeDetails = () => {
    if (!editForm.id) return;
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === editForm.id
          ? ({ ...emp, ...editForm } as EmployeeListItem)
          : emp,
      ),
    );
    setHasChanges(true);
    setSelectedEmployee(null);
  };

  const handleSaveProjectDetails = () => {
    if (!selectedProject) return;
    if (
      selectedProject.oldName !== selectedProject.newName &&
      selectedProject.newName.trim() !== ""
    ) {
      setEmployees((prev) =>
        prev.map((emp) => {
          if (emp.projects?.includes(selectedProject.oldName)) {
            return {
              ...emp,
              projects: emp.projects.map((p) =>
                p === selectedProject.oldName ? selectedProject.newName : p,
              ),
            };
          }
          return emp;
        }),
      );
      // Keep standalone (empty) project names in sync on rename
      setStandaloneProjects((prev) =>
        prev.map((p) =>
          p === selectedProject.oldName ? selectedProject.newName : p,
        ),
      );
      setHasChanges(true);
    }
    setSelectedProject(null);
  };

  const handleAddEmployee = useCallback(() => {
    // Open the shared Employee form sheet in "create" mode. The actual
    // employee record is only materialised once the user submits the form.
    setAddEmployeeSheetOpen(true);
  }, []);

  const handleSubmitNewEmployee = useCallback(
    async (values: EmployeeFormValues): Promise<boolean> => {
      const trimmedId = values.id.trim();
      if (!trimmedId) {
        alert("Employee ID is required.");
        return false;
      }
      if (employees.some((e) => e.id === trimmedId)) {
        alert(`Employee ID "${trimmedId}" already exists on the chart.`);
        return false;
      }

      const newEmployee: EmployeeListItem = {
        id: trimmedId,
        name: values.name.trim() || "New Employee",
        email: values.email.trim(),
        title: values.title.trim() || null,
        division: values.division || undefined,
        level: values.level || null,
        position: values.position || null,
        employment_type: values.employment_type,
        subordinates: [],
        projects: [],
        avatar: null,
        is_active: true,
      };

      setEmployees((prev) => [...prev, newEmployee]);
      setHasChanges(true);
      return true;
    },
    [employees],
  );

  // Initial values handed to the sheet whenever it opens in "create" mode.
  // Pre-fills the division from the active chart filter so newly added
  // employees land inside the division the user is currently viewing.
  const newEmployeeInitialValues = useMemo<Partial<EmployeeFormValues>>(
    () => ({
      division: activeDivisionFilter ?? "",
      employment_type: "full-time",
    }),
    [activeDivisionFilter],
  );

  const handleDeleteEmployee = useCallback((employeeId: string) => {
    setEmployees((prev) => {
      // Remove the employee entirely AND clean it from every other
      // employee's subordinates list so no dangling references remain.
      const filtered = prev
        .filter((emp) => emp.id !== employeeId)
        .map((emp) => {
          if (emp.subordinates?.includes(employeeId)) {
            return {
              ...emp,
              subordinates: emp.subordinates.filter((id) => id !== employeeId),
            };
          }
          return emp;
        });
      return filtered;
    });
    setHasChanges(true);
    setSelectedEmployee(null);
  }, []);

  const handleDeleteProject = useCallback((projectName: string) => {
    // Drop from every employee's projects array.
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.projects?.includes(projectName)) {
          return {
            ...emp,
            projects: emp.projects.filter((p) => p !== projectName),
          };
        }
        return emp;
      }),
    );
    // Drop from the standalone (empty-box) list if present.
    setStandaloneProjects((prev) => prev.filter((p) => p !== projectName));
    setHasChanges(true);
    setSelectedProject(null);
  }, []);

  const handleAddProject = useCallback(() => {
    setStandaloneProjects((prevStandalone) => {
      // Gather every project name already present (from employees + standalone)
      const existingNames = new Set<string>(prevStandalone);
      employees.forEach((emp) => {
        emp.projects?.forEach((p) => existingNames.add(p));
      });

      // Find a unique default name: "New Project", "New Project 2", ...
      let candidate = "New Project";
      let counter = 2;
      while (existingNames.has(candidate)) {
        candidate = `New Project ${counter}`;
        counter += 1;
      }

      setHasChanges(true);
      // Open the rename modal immediately so the user can name it
      setSelectedProject({ oldName: candidate, newName: candidate });
      return [...prevStandalone, candidate];
    });
  }, [employees]);

  const handleSaveChart = async (): Promise<void> => {
    try {
      const payload = employees.map((e) => ({
        id: e.id,
        name: e.name,
        email: e.email || null,
        title: e.title ?? null,
        division: e.division ?? null,
        level: e.level ?? null,
        position: e.position ?? null,
        subordinates: e.subordinates ?? [],
        projects: e.projects ?? [],
        avatar: e.avatar ?? null,
      }));
      const result = await saveChart(payload);
      setHasChanges(false);
      alert(
        `Chart saved: ${result.created} created, ${result.updated} updated, ${result.deactivated} deactivated.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Failed to save chart: ${message}`);
    }
  };

  return (
    <div className={`h-full w-full relative ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
        nodesDraggable
        nodesConnectable
        elementsSelectable
      >
        {/* NEW: Clear Filter Button Panel */}
        {activeDivisionFilter && (
          <Panel position="top-left" className="m-4">
            <button
              onClick={() => setActiveDivisionFilter(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg shadow-md transition-colors duration-200 flex items-center space-x-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Clear Filter ({activeDivisionFilter})</span>
            </button>
          </Panel>
        )}

        {/* Editor Toolbar: Add Employee + Add Project */}
        <Panel position="bottom-left" className="m-4">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur border border-gray-200 rounded-lg shadow-md p-2">
            <button
              onClick={handleAddEmployee}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors duration-200 flex items-center space-x-2"
              title="Add a new employee to the chart"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add Employee</span>
            </button>
            <button
              onClick={handleAddProject}
              className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-md shadow-sm transition-colors duration-200 flex items-center space-x-2"
              title="Add a new project box to the chart"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add Project</span>
            </button>
          </div>
        </Panel>

        {/* Top-right toolbox: name-search highlighter + (optional) Save button */}
        <Panel position="top-right" className="m-4">
          <div className="flex flex-col items-end gap-2">
            {/* Name search / highlighter */}
            <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
              <div className="pl-3 pr-1 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={highlightQuery}
                onChange={(e) => setHighlightQuery(e.target.value)}
                placeholder="Highlight by name..."
                className="px-2 py-2 text-sm w-56 outline-none bg-transparent"
              />
              {highlightQuery && (
                <button
                  onClick={() => setHighlightQuery("")}
                  className="px-2 h-full text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {hasChanges && (
              <button
                onClick={handleSaveChart}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-md transition-colors duration-200 flex items-center space-x-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Save Chart</span>
              </button>
            )}
          </div>
        </Panel>
        <Controls className="bg-white shadow-lg border border-gray-200 rounded-lg" />
        <MiniMap maskColor="rgba(255, 255, 255, 0.8)" />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#e5e7eb"
        />
      </ReactFlow>

      {/* Editable Employee Popup */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-[360px] max-w-[90vw] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Employee
              </h3>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-2 py-1 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex flex-col space-y-1">
                <label className="text-gray-600 font-medium">Name</label>
                <input
                  type="text"
                  value={editForm.name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-gray-600 font-medium">Title</label>
                <input
                  type="text"
                  value={editForm.title || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-gray-600 font-medium">Division</label>
                <input
                  type="text"
                  value={editForm.division || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, division: e.target.value })
                  }
                  className="border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="e.g. Engineering"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-gray-600 font-medium">
                  Projects (comma separated)
                </label>
                <input
                  type="text"
                  value={editForm.projects?.join(", ") || ""}
                  onChange={(e) => {
                    const projectList = e.target.value
                      .split(",")
                      .map((p) => p.trim())
                      .filter(Boolean);
                    setEditForm({ ...editForm, projects: projectList });
                  }}
                  className="border border-gray-300 rounded px-3 py-2 outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => {
                  if (!selectedEmployee) return;
                  const confirmed = window.confirm(
                    `Delete employee "${selectedEmployee.name}"? This will remove them from the chart and from any supervisor's subordinates.`,
                  );
                  if (confirmed) handleDeleteEmployee(selectedEmployee.id);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
                title="Delete this employee from the chart"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                  />
                </svg>
                <span>Delete</span>
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEmployeeDetails}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editable Project Group Popup */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-[360px] max-w-[90vw] p-6 border-t-4 border-orange-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Project Group
              </h3>
              <button
                onClick={() => setSelectedProject(null)}
                className="px-2 py-1 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex flex-col space-y-1">
                <label className="text-gray-600 font-medium">
                  Project Name
                </label>
                <input
                  type="text"
                  value={selectedProject.newName}
                  onChange={(e) =>
                    setSelectedProject({
                      ...selectedProject,
                      newName: e.target.value,
                    })
                  }
                  className="border border-gray-300 rounded px-3 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => {
                  if (!selectedProject) return;
                  const confirmed = window.confirm(
                    `Delete project "${selectedProject.oldName}"? This will remove the project box and detach it from every employee.`,
                  );
                  if (confirmed) handleDeleteProject(selectedProject.oldName);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
                title="Delete this project and detach it from all employees"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                  />
                </svg>
                <span>Delete</span>
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedProject(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProjectDetails}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Save Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared Add-Employee sheet (same dialog as the Employee Management page) */}
      <EmployeeFormSheet
        open={addEmployeeSheetOpen}
        onOpenChange={setAddEmployeeSheetOpen}
        mode="create"
        initialValues={newEmployeeInitialValues}
        onSubmit={handleSubmitNewEmployee}
      />
    </div>
  );
}
