# Why We Do Things This Way

## Frontend Architecture
- **Single-page apps per route** (dashboard.html, auth.html) - No SPA framework overhead
- **Global window objects** - Simple state management without complexity
- **Inline CSS** - No build step, faster development

## Backend Architecture  
- **Lazy-loaded handlers** - Better cold start performance
- **Single worker with environments** - Simpler deployment
- **AWS→Supabase→Env config cascade** - Flexibility with security

## DON'T Change These Patterns Without Good Reason
