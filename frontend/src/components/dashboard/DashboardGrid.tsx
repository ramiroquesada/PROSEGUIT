import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import QuickActionsWidget from './widgets/QuickActionsWidget';
import LoansAlertWidget from './widgets/LoansAlertWidget';
import RepairAlertWidget from './widgets/RepairAlertWidget';
import EquipmentByTypeWidget from './widgets/EquipmentByTypeWidget';
import ActivityFeedWidget from './widgets/ActivityFeedWidget';
import widgetStyles from './widgets/Widget.module.css';
import styles from './DashboardGrid.module.css';

const LAYOUT_KEY = 'dashboard_layout';

const DEFAULT_ORDER = [
  'quick-actions',
  'loans-alert',
  'repair-alert',
  'equipment-by-type',
  'activity-feed',
];

const FULL_WIDTH_WIDGETS = new Set(['activity-feed']);

function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_ORDER;
    const parsed = JSON.parse(raw) as string[];
    // Validar que contiene todos los widgets esperados (por si se agregaron nuevos)
    const hasAll = DEFAULT_ORDER.every((id) => parsed.includes(id));
    return hasAll ? parsed : DEFAULT_ORDER;
  } catch {
    return DEFAULT_ORDER;
  }
}

function WidgetContent({ id }: { id: string }) {
  switch (id) {
    case 'quick-actions':    return <QuickActionsWidget />;
    case 'loans-alert':      return <LoansAlertWidget />;
    case 'repair-alert':     return <RepairAlertWidget />;
    case 'equipment-by-type': return <EquipmentByTypeWidget />;
    case 'activity-feed':    return <ActivityFeedWidget />;
    default:                 return null;
  }
}

function SortableWidget({ id }: { id: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isFullWidth = FULL_WIDTH_WIDGETS.has(id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isFullWidth ? styles.fullWidth : undefined}
      {...attributes}
    >
      <div style={{ position: 'relative' }} className={isDragging ? widgetStyles.widgetDragging : undefined}>
        {/* Drag handle superpuesto en esquina superior derecha */}
        <div
          ref={setActivatorNodeRef}
          {...listeners}
          className={widgetStyles.dragHandle}
          style={{
            position: 'absolute',
            top: 'var(--space-md)',
            right: 'var(--space-md)',
            zIndex: 1,
          }}
          title="Arrastrar widget"
        >
          <GripVertical size={14} />
        </div>
        <WidgetContent id={id} />
      </div>
    </div>
  );
}

export default function DashboardGrid() {
  const [order, setOrder] = useState<string[]>(loadOrder);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      const next = arrayMove(prev, oldIndex, newIndex);
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className={styles.grid}>
          {order.map((id) => (
            <SortableWidget key={id} id={id} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
