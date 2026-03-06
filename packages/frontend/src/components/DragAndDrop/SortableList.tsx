//For now this will primarily be used to for the drag and drop functionality of the candidate list in races. But the hope is that
//this can be used for other drag and drop functionality such as ranked choice voting.
//This is a modified version of the SortableList component from the dnd-kit examples. The original can be found here: 
//https://codesandbox.io/p/sandbox/dnd-kit-sortable-starter-template-22x1ix
import React, { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import type { Active, UniqueIdentifier } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates
} from "@dnd-kit/sortable";

import "./SortableList.css";

import { DragHandle, SortableItem } from "./SortableItem";
import {SortableOverlay}  from "./SortableOverlay";

interface BaseItem {
  id: UniqueIdentifier;
}

interface Props<T extends BaseItem> {
  items: T[];
  identifierKey: keyof T;
  onChange(items: T[]): void;
  indexIsValid?(index: number): boolean;
  renderItem(item: T, index: number): ReactNode;
}
/**
 * A sortable list component that allows items to be dragged and reordered.
 * 
 * @template T - The type of the items in the list.
 * 
 * @param {T[]} items - The list of items to be displayed and sorted.
 * @param {keyof T} identifierKey - The key in each item object that uniquely identifies it.
 * @param {(items: T[]) => void} onChange - Callback function triggered when the list order changes.
 * @param {(item: T, index: number) => ReactNode} renderItem - Function to render each item in the list.
 * 
 * @returns {JSX.Element} The rendered sortable list component.
 * 
 * @example
 * <SortableList
 *   items={candidates}
 *   identifierKey="candidate_id"
 *   onChange={setCandidates}
 *   renderItem={(candidate, index) => (
 *     <SortableList.Item id={candidate.candidate_id}>
 *       {candidate.name}
 *       <SortableList.DragHandle />
 *     </SortableList.Item>
 *   )}
 * />
 */
export function SortableList<T extends BaseItem>({
  items,
  identifierKey,
  onChange,
  renderItem,
  indexIsValid=() => true,
}: Props<T>) {
  const [active, setActive] = useState<Active | null>(null);
  const activeItem = useMemo(
    () => items.find((item) => item[identifierKey] === active?.id),
    [active, items]
  );
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => {
        setActive(active);
      }}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over?.id) {
          const activeIndex = items.findIndex((item) => item[identifierKey] === active.id);
          const overIndex = items.findIndex((item) => item[identifierKey] === over.id);

          if(indexIsValid(overIndex)) onChange(arrayMove(items, activeIndex, overIndex));
        }
        setActive(null);
      }}
      onDragCancel={() => {
        setActive(null);
      }}
    >
      <SortableContext items={items.map(item => item[identifierKey] as string)}>
        <ul className="SortableList" role="application">
          {items.map((item, index) => (
            <React.Fragment key={item[identifierKey] as string}>{renderItem(item, index)}</React.Fragment>
          ))}
        </ul>
      </SortableContext>
      <SortableOverlay>
        {activeItem ? renderItem(activeItem, items.findIndex(item => item[identifierKey] === activeItem.id)) : null}
      </SortableOverlay>
    </DndContext>
  );
}

SortableList.Item = SortableItem;
SortableList.DragHandle = DragHandle;
