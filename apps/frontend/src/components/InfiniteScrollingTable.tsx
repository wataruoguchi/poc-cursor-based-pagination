import React from "react";

import {
  type ColumnDef,
  flexRender,
  type Table as TableType,
} from "@tanstack/react-table";
import type { Virtualizer } from "@tanstack/react-virtual";
import type { createUseAuthPaginationQuery } from "../lib/create-use-auth-pagination-query";
import { useVirtualTable } from "../hooks/use-virtual-table";

export function TableHeader<T>({ table }: { table: TableType<T> }) {
  return (
    <thead
      style={{
        display: "grid",
        position: "sticky",
        top: 0,
        zIndex: 1,
      }}
    >
      {table.getHeaderGroups().map((headerGroup) => (
        <tr
          key={headerGroup.id}
          style={{ display: "flex", width: "100%" }}
          data-testid={`header-row-${headerGroup.id}`}
        >
          {headerGroup.headers.map((header) => (
            <th
              key={header.id}
              style={{
                display: "flex",
                width: header.getSize(),
                backgroundColor: "pink",
              }}
              data-testid={`header-cell-${header.id}`}
            >
              <div
                {...{
                  className: header.column.getCanSort()
                    ? "cursor-pointer select-none"
                    : "",
                  onClick: header.column.getToggleSortingHandler(),
                }}
              >
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
                {{
                  asc: " 🔼",
                  desc: " 🔽",
                }[header.column.getIsSorted() as string] ?? null}
              </div>
            </th>
          ))}
        </tr>
      ))}
    </thead>
  );
}

export function TableBody<T>({
  table,
  rowVirtualizer,
}: {
  table: TableType<T>;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
}) {
  const { rows } = table.getRowModel();

  return (
    <tbody
      style={{
        display: "grid",
        height: `${rowVirtualizer.getTotalSize()}px`,
        position: "relative",
      }}
      data-testid="table-body"
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index];
        return (
          <tr
            data-index={virtualRow.index}
            ref={(node) => rowVirtualizer.measureElement(node)}
            key={row.id}
            style={{
              display: "flex",
              position: "absolute",
              transform: `translateY(${virtualRow.start}px)`,
              width: "100%",
            }}
            data-testid={`table-row-${row.id}`}
          >
            {row.getVisibleCells().map((cell) => (
              <td
                key={cell.id}
                style={{
                  display: "flex",
                  width: cell.column.getSize(),
                }}
                data-testid={`table-cell-${cell.id}`}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
}

export interface InfiniteScrollingTableProps<T> {
  query: ReturnType<typeof createUseAuthPaginationQuery<T>>;
  columns: ColumnDef<T>[];
  containerHeight?: number;
  rowHeight?: number;
  overscan?: number;
  scrollThreshold?: number;
  loadingComponent?: React.ReactNode;
  fetchingComponent?: React.ReactNode;
  className?: string;
}

export function InfiniteScrollingTable<T>({
  query,
  columns,
  containerHeight = 600,
  rowHeight = 33,
  overscan = 5,
  scrollThreshold = 500,
  loadingComponent = <>Loading...</>,
  fetchingComponent = <div>Fetching More...</div>,
  className,
}: InfiniteScrollingTableProps<T>) {
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const { data, fetchNextPage, isFetching, isLoading } = query();

  const flatData = React.useMemo(
    () => data?.pages?.flatMap((page) => page.data) ?? [],
    [data],
  );
  const totalDBRowCount = data?.pages?.[0].meta.totalRowCount ?? 0;
  const totalFetched = flatData.length;

  const fetchMoreOnBottomReached = React.useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        if (
          scrollHeight - scrollTop - clientHeight < scrollThreshold &&
          !isFetching &&
          totalFetched < totalDBRowCount
        ) {
          void fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalDBRowCount, scrollThreshold],
  );

  React.useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  const { table, rowVirtualizer } = useVirtualTable({
    data: flatData,
    columns,
    containerRef: tableContainerRef,
    rowHeight,
    overscan,
  });

  if (isLoading) {
    return loadingComponent;
  }

  return (
    <div className={className} data-testid="infinite-scrolling-table">
      <div data-testid="row-count">
        ({flatData.length} of {totalDBRowCount} rows fetched)
      </div>
      <div
        className="container"
        onScroll={(e) => fetchMoreOnBottomReached(e.currentTarget)}
        ref={tableContainerRef}
        style={{
          overflow: "auto",
          position: "relative",
          height: `${containerHeight}px`,
        }}
        data-testid="table-container"
      >
        <table style={{ display: "grid" }}>
          <TableHeader table={table} />
          <TableBody table={table} rowVirtualizer={rowVirtualizer} />
        </table>
      </div>
      {isFetching && fetchingComponent}
    </div>
  );
}
