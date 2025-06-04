import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  type FetchedOrganizations,
  FetchedOrganizationsSchema,
  getApiEndpointPath,
  queryKeyToOrganizations,
} from "../lib/api/organizations";

export function InviteUserModal() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    data: organizations = [],
    isLoading,
    error,
  } = useQuery<FetchedOrganizations[]>({
    queryKey: queryKeyToOrganizations,
    queryFn: async () => {
      const response = await fetch(getApiEndpointPath);
      if (!response.ok) {
        throw new Error("Failed to fetch organizations");
      }
      const data = await response.json();
      return data.map((org: unknown) => FetchedOrganizationsSchema.parse(org));
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
      organizationId: "",
    },
    onSubmit: async ({ value }) => {
      try {
        console.log(value);
        const response = await fetch("https://localhost:3000/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: value.email,
            organizationId: value.organizationId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to invite user");
        }

        setIsOpen(false);
        form.reset();
      } catch (error) {
        console.error("Error inviting user:", error);
      }
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Invite User
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Invite User</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
              <div className="mb-4">
                <form.Field
                  name="organizationId"
                  // biome-ignore lint/correctness/noChildrenProp: <explanation>
                  children={(field) => {
                    return (
                      <>
                        <label
                          htmlFor={field.name}
                          className="block text-gray-700 text-sm font-bold mb-2"
                        >
                          Organization
                        </label>
                        <select
                          id={field.name}
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          disabled={isLoading}
                        >
                          <option value="">Select an organization</option>
                          {isLoading ? (
                            <option value="" disabled>
                              Loading organizations...
                            </option>
                          ) : error ? (
                            <option value="" disabled>
                              Error loading organizations
                            </option>
                          ) : (
                            organizations.map((org) => (
                              <option key={org.id} value={org.id}>
                                {org.name}
                              </option>
                            ))
                          )}
                        </select>
                        {field.state.meta.errors && (
                          <p className="text-red-500 text-xs mt-1">
                            Failed to load organizations. Please try again.
                          </p>
                        )}
                      </>
                    );
                  }}
                />
              </div>
              <div className="mb-4">
                <form.Field
                  name="email"
                  // biome-ignore lint/correctness/noChildrenProp: <explanation>
                  children={(field) => {
                    return (
                      <>
                        <label
                          htmlFor={field.name}
                          className="block text-gray-700 text-sm font-bold mb-2"
                        >
                          Email
                        </label>
                        <input
                          id={field.name}
                          type="email"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </>
                    );
                  }}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                  // biome-ignore lint/correctness/noChildrenProp: <explanation>
                  children={([canSubmit, isSubmitting]) => {
                    return (
                      <button
                        type="submit"
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        disabled={!canSubmit || isSubmitting}
                      >
                        Invite
                      </button>
                    );
                  }}
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
