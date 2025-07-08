import type { ColumnDef } from "@tanstack/react-table";
import { InfiniteScrollingTable } from "./components/InfiniteScrollingTable";
import { useAuthPaginationQuery } from "./hooks/use-auth-pagination-query";
import {
  type FetchedProducts,
  FetchedProductsSchema,
  getApiEndpointPath,
  queryKeyToProducts,
} from "./lib/api/products";
import { createUseAuthPaginationQuery } from "./lib/create-use-auth-pagination-query";

export function ProductList() {
  const columns: ColumnDef<FetchedProducts>[] = [
    {
      header: "ID",
      accessorKey: "id",
      cell: (info) => <pre>{info.getValue<string>()}</pre>,
      size: 350,
    },
    { header: "Name", accessorKey: "name", size: 300 },
  ];

  return (
    <>
      <h2>Products</h2>
      <InfiniteScrollingTable
        columns={columns}
        query={createUseAuthPaginationQuery(
          useAuthPaginationQuery,
          queryKeyToProducts,
          getApiEndpointPath,
          FetchedProductsSchema,
          { limit: 3 },
        )}
      />
    </>
  );
}
