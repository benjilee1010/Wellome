// Queries a real table on each Supabase project to reset its inactivity clock so
// the free tier doesn't auto-pause it after a week with no traffic. A plain
// /auth/v1/health ping doesn't touch the database and doesn't count as activity,
// which is why the old version of this script didn't actually prevent the pause.
const TARGETS = [
  {
    name: "circles",
    url: "https://yyngrkximraellnovqwu.supabase.co",
    table: "contacts",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bmdya3hpbXJhZWxsbm92cXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5OTkwMzksImV4cCI6MjA5MzU3NTAzOX0.4KunuIbqEYFI0IkwizW4i7OBvayYkF3MleVklgvgmKo",
  },
  {
    name: "wellome",
    url: "https://nebhqkbmyuzoowudkhtk.supabase.co",
    table: "houses",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lYmhxa2JteXV6b293dWRraHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzczMzYsImV4cCI6MjA5NTkxMzMzNn0.UNxc_VtUN1iMWqfBarg8-S8BIegtq76il30onKCUrsY",
  },
];

export default async function handler(req, res) {
  const results = await Promise.all(
    TARGETS.map(async (target) => {
      try {
        const resp = await fetch(`${target.url}/rest/v1/${target.table}?select=id&limit=1`, {
          headers: { apikey: target.anonKey, Authorization: `Bearer ${target.anonKey}` },
          signal: AbortSignal.timeout(10000),
        });
        // RLS may block reads for the anon key (empty array back), but the
        // request still reaches Postgres, which is what resets the pause timer.
        return { name: target.name, ok: resp.ok, status: resp.status };
      } catch (err) {
        return { name: target.name, ok: false, error: err.message };
      }
    })
  );

  const allOk = results.every((r) => r.ok);
  res.status(allOk ? 200 : 502).json({ timestamp: new Date().toISOString(), results });
}
