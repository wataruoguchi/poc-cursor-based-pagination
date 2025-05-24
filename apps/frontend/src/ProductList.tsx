import type { ColumnDef } from "@tanstack/react-table";
import { createUseAuthPaginationQuery } from "./lib/create-use-auth-pagination-query";
import { useAuthPaginationQuery } from "./hooks/use-auth-pagination-query";
import { InfiniteScrollingTable } from "./components/InfiniteScrollingTable";
import {
  type FetchedProducts,
  FetchedProductsSchema,
  getApiEndpointPath,
  queryKeyToProducts,
} from "./lib/api/products";

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
  );
}
