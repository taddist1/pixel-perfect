<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Educational videos are stored as validated YouTube IDs and URLs in `educational_videos`; public reads only published rows, while database policies restrict management to admins, because media stays on YouTube and permissions must remain server-enforced.
- Notifications are rows created by database triggers in `notifications`; push delivery is a queue flushed by the `flushPush` server function (Web Push via @pushforge/builder, VAPID key in secrets) because the Worker runtime has no background jobs.
- Mark visible brand text with both `translate="no"` and `notranslate`, protecting only the name in mixed text so surrounding copy remains translatable.
- Keep the shared language switch in a dedicated fixed top toolbar with matching space reserved by the root layout, so it never overlaps page navigation.
- Render bell notification menus with the shared collision-aware Popover in a portal, so both guest and account menus remain inside the viewport.
- External AI assistants connect via the MCP server in `src/lib/mcp/` (OAuth, tools query as the caller), because user data must stay behind RLS.
