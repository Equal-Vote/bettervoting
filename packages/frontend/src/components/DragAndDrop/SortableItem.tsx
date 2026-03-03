import { createContext, useContext, useMemo } from "react";
import type { CSSProperties, PropsWithChildren } from "react";
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
  UniqueIdentifier
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle as MuiDragHandle } from "@mui/icons-material";
import { IconButton } from "@mui/material";

import "./SortableItem.css";

interface Props {
  id: UniqueIdentifier;
}

interface Context {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  ref(node: HTMLElement | null): void;
}

const SortableItemContext = createContext<Context>({
  attributes: {
    role: "button",
    tabIndex: 0,
    "aria-disabled": false,
    "aria-pressed": false,
    "aria-roledescription": "sortable",
    "aria-describedby": ""
  },
  listeners: undefined,
  ref() {}
});

export function SortableItem({ children, id }: PropsWithChildren<Props>) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition
  } = useSortable({ id });
  const context = useMemo(
    () => ({
      attributes,
      listeners,
      ref: setActivatorNodeRef
    }),
    [attributes, listeners, setActivatorNodeRef]
  );
  const style: CSSProperties = {
    opacity: isDragging ? 0.4 : undefined,
    transform: CSS.Translate.toString(transform),
    transition
  };

  return (
    <SortableItemContext.Provider value={context}>
      <li className="SortableItem" ref={setNodeRef} style={style}>
        {children}
      </li>
    </SortableItemContext.Provider>
  );
}
interface DragHandleProps {
    style?: CSSProperties;
    disabled?: boolean;
    ariaLabel?: string;
}
export function DragHandle({ style, disabled, ariaLabel }: DragHandleProps) {
  const { attributes, listeners, ref } = useContext(SortableItemContext);

  return (
    <IconButton  {...attributes} {...listeners} ref={ref} style={style} disabled={disabled} aria-label={ariaLabel}>
        <MuiDragHandle />
    </IconButton>
  );
}
