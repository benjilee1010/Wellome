// Pings Supabase REST endpoints to reset each project's inactivity clock so the
// free tier doesn't auto-pause them after a week with no traffic.
const TARGETS = [
  {
    name: "circles",
    url: "https://yyngrkximraellnovqwu.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bmdya3hpbXJhZWxsbm92cXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5OTkwMzksImV4cCI6MjA5MzU3NTAzOX0.4KunuIbqEYFI0IkwizW4i7OBvayYkF3MleVklgvgmKo",
  },
  {
    name: "wellome",
    url: "https://nebhqkbmyuzoowudkhtk.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lYmhxa2JteXV6b293dWRraHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzczMzYsImV4cCI6MjA5NTkxMzMzNn0.UNxc_VtUN1iMWqfBarg8-S8BIegtq76il30onKCUrsY",
  },
];

export default async function handler(req, res) {
  const results = await Promise.all(
    TARGETS.map(async (target) => {
      try {
        const resp = await fetch(`${target.url}/auth/v1/health`, {
          headers: { apikey: target.anonKey, Authorization: `Bearer ${target.anonKey}` },
          signal: AbortSignal.timeout(10000),
        });
        return { name: target.name, ok: resp.ok, status: resp.status };
      } catch (err) {
        return { name: target.name, ok: false, error: err.message };
      }
    })
  );

  const allOk = results.every((r) => r.ok);
  res.status(allOk ? 200 : 502).json({ timestamp: new Date().toISOString(), results });
}
