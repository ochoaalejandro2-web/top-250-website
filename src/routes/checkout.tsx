import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout so `/checkout` and `/checkout/success` do not fight over the same component. */
export const Route = createFileRoute("/checkout")({
  component: () => <Outlet />,
});
