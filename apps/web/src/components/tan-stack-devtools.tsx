"use client";

import { TanStackDevtools } from "@tanstack/react-devtools";
import { FormDevtools } from "@tanstack/react-form-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";

export default function TanStackDevTools() {
  return (
    <TanStackDevtools
      config={{
        position: "bottom-right",
        hideUntilHover: true,
        defaultOpen: false,
      }}
      plugins={[
        {
          name: "TanStack Query",
          render: <ReactQueryDevtoolsPanel />,
        },
        {
          name: "TanStack Form",
          render: <FormDevtools />,
        },
      ]}
    />
  );
}
