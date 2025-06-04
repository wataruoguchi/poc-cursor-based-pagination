import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProductList } from "./ProductList";
import { InviteUserModal } from "./components/InviteUserModal";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Organization Management</h1>
          <InviteUserModal />
        </div>
        <ProductList />
      </div>
    </QueryClientProvider>
  );
}

export default App;
