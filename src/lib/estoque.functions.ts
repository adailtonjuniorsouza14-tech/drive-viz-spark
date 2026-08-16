import { createServerFn } from "@tanstack/react-start";

export const getDashboardData = createServerFn({ method: "GET" })
  .inputValidator((data: { force?: boolean } | undefined) => ({ force: !!data?.force }))
  .handler(async ({ data }) => {
    const { getDashboard } = await import("./estoque-cache.server");
    return getDashboard(data.force);
  });
