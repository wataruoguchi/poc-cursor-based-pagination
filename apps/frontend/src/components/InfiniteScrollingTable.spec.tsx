import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InfiniteScrollingTable } from "./InfiniteScrollingTable";
import type { createUseAuthPaginationQuery } from "../lib/create-use-auth-pagination-query";

interface TestData {
  id: number;
  name: string;
  age: number;
}

type TestQuery = ReturnType<typeof createUseAuthPaginationQuery<TestData>>;

describe("InfiniteScrollingTable", () => {
  const columns = [
    {
      header: "ID",
      accessorKey: "id",
    },
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Age",
      accessorKey: "age",
    },
  ];

  const mockData = {
    pages: [
      {
        data: [
          { id: 1, name: "John", age: 30 },
          { id: 2, name: "Jane", age: 25 },
          { id: 3, name: "Bob", age: 35 },
        ],
        meta: { totalRowCount: 100 },
      },
    ],
  };

  const mockQuery = vi.fn().mockReturnValue({
    data: mockData,
    fetchNextPage: vi.fn(),
    isFetching: false,
    isLoading: false,
  }) as unknown as TestQuery;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state when isLoading is true", () => {
    const loadingQuery = vi.fn().mockReturnValue({
      data: undefined,
      fetchNextPage: vi.fn(),
      isFetching: false,
      isLoading: true,
    }) as unknown as TestQuery;

    render(
      <InfiniteScrollingTable
        query={loadingQuery}
        columns={columns}
        loadingComponent={<div>Custom Loading...</div>}
      />,
    );

    expect(screen.getByText("Custom Loading...")).toBeInTheDocument();
  });

  it("renders table with data correctly", () => {
    render(<InfiniteScrollingTable query={mockQuery} columns={columns} />);

    // Check if headers are rendered
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();

    // Check if row count is displayed correctly
    expect(screen.getByText("(3 of 100 rows fetched)")).toBeInTheDocument();

    // Check if table structure is correct
    const tableContainer = screen.getByTestId("table-container");
    expect(tableContainer).toBeInTheDocument();
    expect(tableContainer).toHaveStyle({
      height: "600px",
      overflow: "auto",
      position: "relative",
    });

    // Check if table body exists and has correct structure
    const tableBody = screen.getByTestId("table-body");
    expect(tableBody).toBeInTheDocument();
    expect(tableBody).toHaveStyle({
      display: "grid",
      position: "relative",
    });
  });

  it("displays row count information", () => {
    render(<InfiniteScrollingTable query={mockQuery} columns={columns} />);

    expect(screen.getByText("(3 of 100 rows fetched)")).toBeInTheDocument();
  });

  it("shows fetching component when fetching more data", () => {
    const fetchingQuery = vi.fn().mockReturnValue({
      data: mockData,
      fetchNextPage: vi.fn(),
      isFetching: true,
      isLoading: false,
    }) as unknown as TestQuery;

    render(
      <InfiniteScrollingTable
        query={fetchingQuery}
        columns={columns}
        fetchingComponent={<div>Loading more...</div>}
      />,
    );

    expect(screen.getByText("Loading more...")).toBeInTheDocument();
  });

  it("triggers fetchNextPage when scrolling near bottom", async () => {
    const fetchNextPage = vi.fn();
    const scrollQuery = vi.fn().mockReturnValue({
      data: mockData,
      fetchNextPage,
      isFetching: false,
      isLoading: false,
    }) as unknown as TestQuery;

    render(
      <InfiniteScrollingTable
        query={scrollQuery}
        columns={columns}
        scrollThreshold={100}
      />,
    );

    const container = screen.getByTestId("table-container");

    // Simulate scrolling near bottom
    Object.defineProperty(container, "scrollHeight", { value: 1000 });
    Object.defineProperty(container, "scrollTop", { value: 800 });
    Object.defineProperty(container, "clientHeight", { value: 200 });

    fireEvent.scroll(container);

    await waitFor(() => {
      expect(fetchNextPage).toHaveBeenCalled();
    });
  });

  it("does not trigger fetchNextPage when all data is loaded", () => {
    const completeData = {
      pages: [
        {
          data: Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            name: `Name ${i + 1}`,
            age: 20 + i,
          })),
          meta: { totalRowCount: 100 },
        },
      ],
    };

    const completeQuery = vi.fn().mockReturnValue({
      data: completeData,
      fetchNextPage: vi.fn(),
      isFetching: false,
      isLoading: false,
    }) as unknown as TestQuery;

    render(<InfiniteScrollingTable query={completeQuery} columns={columns} />);

    const container = screen.getByTestId("table-container");

    // Simulate scrolling near bottom
    Object.defineProperty(container, "scrollHeight", { value: 1000 });
    Object.defineProperty(container, "scrollTop", { value: 800 });
    Object.defineProperty(container, "clientHeight", { value: 200 });

    fireEvent.scroll(container);

    expect(completeQuery().fetchNextPage).not.toHaveBeenCalled();
  });
});
