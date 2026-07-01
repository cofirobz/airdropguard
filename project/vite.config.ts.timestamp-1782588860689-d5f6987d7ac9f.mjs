// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import fs from "node:fs";
import path from "node:path";
var __vite_injected_original_dirname = "/home/project";
var STATIC_PAGES = [
  { loc: "https://airdropguard.com/", changefreq: "daily", priority: "1.0" },
  { loc: "https://airdropguard.com/learn", changefreq: "weekly", priority: "0.7" },
  { loc: "https://airdropguard.com/scam-alerts", changefreq: "weekly", priority: "0.8" },
  { loc: "https://airdropguard.com/submit", changefreq: "monthly", priority: "0.6" },
  { loc: "https://airdropguard.com/api-docs", changefreq: "monthly", priority: "0.6" },
  { loc: "https://airdropguard.com/pricing", changefreq: "monthly", priority: "0.6" },
  { loc: "https://airdropguard.com/advertise", changefreq: "monthly", priority: "0.5" }
];
function buildSitemapXml(airdropSlugs) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const entries = [
    ...STATIC_PAGES.map(
      (p) => `<url>
<loc>${p.loc}</loc>
<changefreq>${p.changefreq}</changefreq>
<priority>${p.priority}</priority>
</url>`
    ),
    ...airdropSlugs.map((a) => {
      const lastmod = a.updated_at ? a.updated_at.split("T")[0] : today;
      return `<url>
<loc>https://airdropguard.com/airdrop/${a.slug}</loc>
<lastmod>${lastmod}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>`;
    })
  ].join("\n\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${entries}

</urlset>`;
}
function sitemapGeneratorPlugin() {
  return {
    name: "sitemap-generator",
    async closeBundle() {
      const distSitemap = path.resolve(__vite_injected_original_dirname, "dist/sitemap.xml");
      const envPath = path.resolve(__vite_injected_original_dirname, ".env");
      const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
      const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim() || process.env.VITE_SUPABASE_URL || "";
      const anonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim() || process.env.VITE_SUPABASE_ANON_KEY || "";
      let airdrops = [];
      if (supabaseUrl && anonKey) {
        try {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/airdrops?select=slug,updated_at&published=eq.true&review_status=eq.approved&is_demo=eq.false&order=updated_at.desc`,
            { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
          );
          if (res.ok) {
            airdrops = await res.json();
          } else {
            console.warn(`[sitemap] Supabase returned ${res.status} \u2014 static pages only.`);
          }
        } catch (e) {
          console.warn(`[sitemap] Could not fetch airdrops: ${e} \u2014 static pages only.`);
        }
      } else {
        console.warn("[sitemap] No Supabase credentials found \u2014 static pages only.");
      }
      const xml = buildSitemapXml(airdrops);
      fs.writeFileSync(distSitemap, xml, "utf8");
      console.log(`[sitemap] Generated with ${airdrops.length} airdrop URL(s) \u2192 dist/sitemap.xml`);
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [react(), sitemapGeneratorPlugin()],
  optimizeDeps: {
    exclude: ["lucide-react"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgZnMgZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuXG5jb25zdCBTVEFUSUNfUEFHRVMgPSBbXG4gIHsgbG9jOiAnaHR0cHM6Ly9haXJkcm9wZ3VhcmQuY29tLycsIGNoYW5nZWZyZXE6ICdkYWlseScsICAgcHJpb3JpdHk6ICcxLjAnIH0sXG4gIHsgbG9jOiAnaHR0cHM6Ly9haXJkcm9wZ3VhcmQuY29tL2xlYXJuJywgICAgICAgIGNoYW5nZWZyZXE6ICd3ZWVrbHknLCAgcHJpb3JpdHk6ICcwLjcnIH0sXG4gIHsgbG9jOiAnaHR0cHM6Ly9haXJkcm9wZ3VhcmQuY29tL3NjYW0tYWxlcnRzJywgIGNoYW5nZWZyZXE6ICd3ZWVrbHknLCAgcHJpb3JpdHk6ICcwLjgnIH0sXG4gIHsgbG9jOiAnaHR0cHM6Ly9haXJkcm9wZ3VhcmQuY29tL3N1Ym1pdCcsICAgICAgIGNoYW5nZWZyZXE6ICdtb250aGx5JywgcHJpb3JpdHk6ICcwLjYnIH0sXG4gIHsgbG9jOiAnaHR0cHM6Ly9haXJkcm9wZ3VhcmQuY29tL2FwaS1kb2NzJywgICAgIGNoYW5nZWZyZXE6ICdtb250aGx5JywgcHJpb3JpdHk6ICcwLjYnIH0sXG4gIHsgbG9jOiAnaHR0cHM6Ly9haXJkcm9wZ3VhcmQuY29tL3ByaWNpbmcnLCAgICAgIGNoYW5nZWZyZXE6ICdtb250aGx5JywgcHJpb3JpdHk6ICcwLjYnIH0sXG4gIHsgbG9jOiAnaHR0cHM6Ly9haXJkcm9wZ3VhcmQuY29tL2FkdmVydGlzZScsICAgIGNoYW5nZWZyZXE6ICdtb250aGx5JywgcHJpb3JpdHk6ICcwLjUnIH0sXG5dO1xuXG5mdW5jdGlvbiBidWlsZFNpdGVtYXBYbWwoYWlyZHJvcFNsdWdzOiBBcnJheTx7IHNsdWc6IHN0cmluZzsgdXBkYXRlZF9hdDogc3RyaW5nIH0+KTogc3RyaW5nIHtcbiAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXTtcbiAgY29uc3QgZW50cmllcyA9IFtcbiAgICAuLi5TVEFUSUNfUEFHRVMubWFwKHAgPT5cbiAgICAgIGA8dXJsPlxcbjxsb2M+JHtwLmxvY308L2xvYz5cXG48Y2hhbmdlZnJlcT4ke3AuY2hhbmdlZnJlcX08L2NoYW5nZWZyZXE+XFxuPHByaW9yaXR5PiR7cC5wcmlvcml0eX08L3ByaW9yaXR5PlxcbjwvdXJsPmBcbiAgICApLFxuICAgIC4uLmFpcmRyb3BTbHVncy5tYXAoYSA9PiB7XG4gICAgICBjb25zdCBsYXN0bW9kID0gYS51cGRhdGVkX2F0ID8gYS51cGRhdGVkX2F0LnNwbGl0KCdUJylbMF0gOiB0b2RheTtcbiAgICAgIHJldHVybiBgPHVybD5cXG48bG9jPmh0dHBzOi8vYWlyZHJvcGd1YXJkLmNvbS9haXJkcm9wLyR7YS5zbHVnfTwvbG9jPlxcbjxsYXN0bW9kPiR7bGFzdG1vZH08L2xhc3Rtb2Q+XFxuPGNoYW5nZWZyZXE+d2Vla2x5PC9jaGFuZ2VmcmVxPlxcbjxwcmlvcml0eT4wLjg8L3ByaW9yaXR5PlxcbjwvdXJsPmA7XG4gICAgfSksXG4gIF0uam9pbignXFxuXFxuJyk7XG4gIHJldHVybiBgPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIj8+XFxuPHVybHNldCB4bWxucz1cImh0dHA6Ly93d3cuc2l0ZW1hcHMub3JnL3NjaGVtYXMvc2l0ZW1hcC8wLjlcIj5cXG5cXG4ke2VudHJpZXN9XFxuXFxuPC91cmxzZXQ+YDtcbn1cblxuZnVuY3Rpb24gc2l0ZW1hcEdlbmVyYXRvclBsdWdpbigpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnc2l0ZW1hcC1nZW5lcmF0b3InLFxuICAgIGFzeW5jIGNsb3NlQnVuZGxlKCkge1xuICAgICAgY29uc3QgZGlzdFNpdGVtYXAgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnZGlzdC9zaXRlbWFwLnhtbCcpO1xuXG4gICAgICAvLyBSZWFkIFN1cGFiYXNlIGNyZWRlbnRpYWxzIGZyb20gLmVudiBvciBwcm9jZXNzLmVudlxuICAgICAgY29uc3QgZW52UGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuZW52Jyk7XG4gICAgICBjb25zdCBlbnZDb250ZW50ID0gZnMuZXhpc3RzU3luYyhlbnZQYXRoKSA/IGZzLnJlYWRGaWxlU3luYyhlbnZQYXRoLCAndXRmOCcpIDogJyc7XG4gICAgICBjb25zdCBzdXBhYmFzZVVybCA9IChlbnZDb250ZW50Lm1hdGNoKC9WSVRFX1NVUEFCQVNFX1VSTD0oLispLyk/LlsxXT8udHJpbSgpKSB8fCBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX1VSTCB8fCAnJztcbiAgICAgIGNvbnN0IGFub25LZXkgICAgPSAoZW52Q29udGVudC5tYXRjaCgvVklURV9TVVBBQkFTRV9BTk9OX0tFWT0oLispLyk/LlsxXT8udHJpbSgpKSB8fCBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX0FOT05fS0VZIHx8ICcnO1xuXG4gICAgICBsZXQgYWlyZHJvcHM6IEFycmF5PHsgc2x1Zzogc3RyaW5nOyB1cGRhdGVkX2F0OiBzdHJpbmcgfT4gPSBbXTtcblxuICAgICAgaWYgKHN1cGFiYXNlVXJsICYmIGFub25LZXkpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChcbiAgICAgICAgICAgIGAke3N1cGFiYXNlVXJsfS9yZXN0L3YxL2FpcmRyb3BzP3NlbGVjdD1zbHVnLHVwZGF0ZWRfYXQmcHVibGlzaGVkPWVxLnRydWUmcmV2aWV3X3N0YXR1cz1lcS5hcHByb3ZlZCZpc19kZW1vPWVxLmZhbHNlJm9yZGVyPXVwZGF0ZWRfYXQuZGVzY2AsXG4gICAgICAgICAgICB7IGhlYWRlcnM6IHsgYXBpa2V5OiBhbm9uS2V5LCBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7YW5vbktleX1gIH0gfVxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKHJlcy5vaykge1xuICAgICAgICAgICAgYWlyZHJvcHMgPSBhd2FpdCByZXMuanNvbigpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYFtzaXRlbWFwXSBTdXBhYmFzZSByZXR1cm5lZCAke3Jlcy5zdGF0dXN9IFx1MjAxNCBzdGF0aWMgcGFnZXMgb25seS5gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oYFtzaXRlbWFwXSBDb3VsZCBub3QgZmV0Y2ggYWlyZHJvcHM6ICR7ZX0gXHUyMDE0IHN0YXRpYyBwYWdlcyBvbmx5LmApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLndhcm4oJ1tzaXRlbWFwXSBObyBTdXBhYmFzZSBjcmVkZW50aWFscyBmb3VuZCBcdTIwMTQgc3RhdGljIHBhZ2VzIG9ubHkuJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHhtbCA9IGJ1aWxkU2l0ZW1hcFhtbChhaXJkcm9wcyk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKGRpc3RTaXRlbWFwLCB4bWwsICd1dGY4Jyk7XG4gICAgICBjb25zb2xlLmxvZyhgW3NpdGVtYXBdIEdlbmVyYXRlZCB3aXRoICR7YWlyZHJvcHMubGVuZ3RofSBhaXJkcm9wIFVSTChzKSBcdTIxOTIgZGlzdC9zaXRlbWFwLnhtbGApO1xuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpLCBzaXRlbWFwR2VuZXJhdG9yUGx1Z2luKCldLFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICB9LFxufSk7XG5cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sUUFBUTtBQUNmLE9BQU8sVUFBVTtBQUhqQixJQUFNLG1DQUFtQztBQUt6QyxJQUFNLGVBQWU7QUFBQSxFQUNuQixFQUFFLEtBQUssNkJBQTZCLFlBQVksU0FBVyxVQUFVLE1BQU07QUFBQSxFQUMzRSxFQUFFLEtBQUssa0NBQXlDLFlBQVksVUFBVyxVQUFVLE1BQU07QUFBQSxFQUN2RixFQUFFLEtBQUssd0NBQXlDLFlBQVksVUFBVyxVQUFVLE1BQU07QUFBQSxFQUN2RixFQUFFLEtBQUssbUNBQXlDLFlBQVksV0FBVyxVQUFVLE1BQU07QUFBQSxFQUN2RixFQUFFLEtBQUsscUNBQXlDLFlBQVksV0FBVyxVQUFVLE1BQU07QUFBQSxFQUN2RixFQUFFLEtBQUssb0NBQXlDLFlBQVksV0FBVyxVQUFVLE1BQU07QUFBQSxFQUN2RixFQUFFLEtBQUssc0NBQXlDLFlBQVksV0FBVyxVQUFVLE1BQU07QUFDekY7QUFFQSxTQUFTLGdCQUFnQixjQUFtRTtBQUMxRixRQUFNLFNBQVEsb0JBQUksS0FBSyxHQUFFLFlBQVksRUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBQ25ELFFBQU0sVUFBVTtBQUFBLElBQ2QsR0FBRyxhQUFhO0FBQUEsTUFBSSxPQUNsQjtBQUFBLE9BQWUsRUFBRSxHQUFHO0FBQUEsY0FBdUIsRUFBRSxVQUFVO0FBQUEsWUFBNEIsRUFBRSxRQUFRO0FBQUE7QUFBQSxJQUMvRjtBQUFBLElBQ0EsR0FBRyxhQUFhLElBQUksT0FBSztBQUN2QixZQUFNLFVBQVUsRUFBRSxhQUFhLEVBQUUsV0FBVyxNQUFNLEdBQUcsRUFBRSxDQUFDLElBQUk7QUFDNUQsYUFBTztBQUFBLHdDQUFnRCxFQUFFLElBQUk7QUFBQSxXQUFvQixPQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFDMUYsQ0FBQztBQUFBLEVBQ0gsRUFBRSxLQUFLLE1BQU07QUFDYixTQUFPO0FBQUE7QUFBQTtBQUFBLEVBQTJHLE9BQU87QUFBQTtBQUFBO0FBQzNIO0FBRUEsU0FBUyx5QkFBeUI7QUFDaEMsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sTUFBTSxjQUFjO0FBQ2xCLFlBQU0sY0FBYyxLQUFLLFFBQVEsa0NBQVcsa0JBQWtCO0FBRzlELFlBQU0sVUFBVSxLQUFLLFFBQVEsa0NBQVcsTUFBTTtBQUM5QyxZQUFNLGFBQWEsR0FBRyxXQUFXLE9BQU8sSUFBSSxHQUFHLGFBQWEsU0FBUyxNQUFNLElBQUk7QUFDL0UsWUFBTSxjQUFlLFdBQVcsTUFBTSx3QkFBd0IsSUFBSSxDQUFDLEdBQUcsS0FBSyxLQUFNLFFBQVEsSUFBSSxxQkFBcUI7QUFDbEgsWUFBTSxVQUFjLFdBQVcsTUFBTSw2QkFBNkIsSUFBSSxDQUFDLEdBQUcsS0FBSyxLQUFNLFFBQVEsSUFBSSwwQkFBMEI7QUFFM0gsVUFBSSxXQUF3RCxDQUFDO0FBRTdELFVBQUksZUFBZSxTQUFTO0FBQzFCLFlBQUk7QUFDRixnQkFBTSxNQUFNLE1BQU07QUFBQSxZQUNoQixHQUFHLFdBQVc7QUFBQSxZQUNkLEVBQUUsU0FBUyxFQUFFLFFBQVEsU0FBUyxlQUFlLFVBQVUsT0FBTyxHQUFHLEVBQUU7QUFBQSxVQUNyRTtBQUNBLGNBQUksSUFBSSxJQUFJO0FBQ1YsdUJBQVcsTUFBTSxJQUFJLEtBQUs7QUFBQSxVQUM1QixPQUFPO0FBQ0wsb0JBQVEsS0FBSywrQkFBK0IsSUFBSSxNQUFNLDRCQUF1QjtBQUFBLFVBQy9FO0FBQUEsUUFDRixTQUFTLEdBQUc7QUFDVixrQkFBUSxLQUFLLHVDQUF1QyxDQUFDLDRCQUF1QjtBQUFBLFFBQzlFO0FBQUEsTUFDRixPQUFPO0FBQ0wsZ0JBQVEsS0FBSyxtRUFBOEQ7QUFBQSxNQUM3RTtBQUVBLFlBQU0sTUFBTSxnQkFBZ0IsUUFBUTtBQUNwQyxTQUFHLGNBQWMsYUFBYSxLQUFLLE1BQU07QUFDekMsY0FBUSxJQUFJLDRCQUE0QixTQUFTLE1BQU0seUNBQW9DO0FBQUEsSUFDN0Y7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLHVCQUF1QixDQUFDO0FBQUEsRUFDM0MsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
