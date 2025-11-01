"use client";

import { TanStackDevtools } from "@tanstack/react-devtools";
import { FormDevtoolsPlugin } from "@tanstack/react-form-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";

export default function TanStackDevTools() {
  return (
    <TanStackDevtools
      config={{
        position: "bottom-right",
      }}
      plugins={[
        {
          name: "TanStack Query",
          render: <ReactQueryDevtoolsPanel />,
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        FormDevtoolsPlugin(),
      ]}
    />
  );
}
