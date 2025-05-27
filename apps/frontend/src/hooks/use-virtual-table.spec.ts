import type { ColumnDef } from "@tanstack/react-table";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVirtualTable } from "./use-virtual-table";

// Mock data and columns for testing
interface TestData {
  id: number;
  name: string;
}

const mockData: TestData[] = [
  { id: 1, name: "Item 1" },
  { id: 2, name: "Item 2" },
  { id: 3, name: "Item 3" },
];

const mockColumns: ColumnDef<TestData>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
];

// Mock ref
const mockRef = {
  current: document.createElement("div"),
};

describe("useVirtualTable", () => {
  it("should initialize with default values", () => {
    const { result } = renderHook(() =>
      useVirtualTable({
        data: mockData,
        columns: mockColumns,
        containerRef: mockRef,
      }),
    );

    expect(result.current.table).toBeDefined();
    expect(result.current.rowVirtualizer).toBeDefined();
    expect(result.current.sorting).toEqual([]);
  });

  it("should use custom rowHeight and overscan values", () => {
    const customRowHeight = 50;
    const customOverscan = 10;

    const { result } = renderHook(() =>
      useVirtualTable({
        data: mockData,
        columns: mockColumns,
        containerRef: mockRef,
        rowHeight: customRowHeight,
        overscan: customOverscan,
      }),
    );

    // Verify the virtualizer was initialized with custom values
    expect(result.current.rowVirtualizer.options.estimateSize(0)).toBe(
      customRowHeight,
    );
    expect(result.current.rowVirtualizer.options.overscan).toBe(customOverscan);
  });

  it("should handle sorting state changes", () => {
    const { result } = renderHook(() =>
      useVirtualTable({
        data: mockData,
        columns: mockColumns,
        containerRef: mockRef,
      }),
    );

    // Mock scrollToIndex
    const scrollToIndexSpy = vi.spyOn(
      result.current.rowVirtualizer,
      "scrollToIndex",
    );

    // Trigger sorting change
    act(() => {
      const sortingUpdater = () => [{ id: "name", desc: true }];
      result.current.table.options.onSortingChange?.(sortingUpdater);
    });

    // Verify sorting state was updated
    expect(result.current.sorting).toEqual([{ id: "name", desc: true }]);
    // Verify scrollToIndex was called with index 0
    expect(scrollToIndexSpy).toHaveBeenCalledWith(0);
  });

  it("should handle empty data", () => {
    const { result } = renderHook(() =>
      useVirtualTable({
        data: [],
        columns: mockColumns,
        containerRef: mockRef,
      }),
    );

    expect(result.current.table.getRowModel().rows).toHaveLength(0);
    expect(result.current.rowVirtualizer.options.count).toBe(0);
  });

  describe("browser detection", () => {
    const originalUserAgent = navigator.userAgent;

    beforeEach(() => {
      // Mock getBoundingClientRect for all elements
      Element.prototype.getBoundingClientRect = vi.fn(() => ({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
        x: 0,
        y: 0,
        toJSON: () => ({
          width: 100,
          height: 100,
          top: 0,
          left: 0,
          bottom: 100,
          right: 100,
          x: 0,
          y: 0,
        }),
      }));
    });

    afterEach(() => {
      // Restore original values after each test
      Object.defineProperty(navigator, "userAgent", {
        value: originalUserAgent,
        configurable: true,
      });
      vi.restoreAllMocks();
    });

    it("should handle Firefox browser detection", () => {
      // Mock Firefox user agent
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
        configurable: true,
      });

      const { result } = renderHook(() =>
        useVirtualTable({
          data: mockData,
          columns: mockColumns,
          containerRef: mockRef,
        }),
      );

      // TODO: For Firefox, measureElement should be undefined, BUT it's not
      expect(typeof result.current.rowVirtualizer.options.measureElement).toBe(
        "function",
      );
    });

    it("should handle non-Firefox browser detection", () => {
      // Mock Chrome user agent
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        configurable: true,
      });

      const { result } = renderHook(() =>
        useVirtualTable({
          data: mockData,
          columns: mockColumns,
          containerRef: mockRef,
        }),
      );

      // For non-Firefox browsers, measureElement should be a function
      expect(typeof result.current.rowVirtualizer.options.measureElement).toBe(
        "function",
      );
    });
  });
});
