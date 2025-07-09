# AI Outreach Frontend

## Setup

1. Clone repo  
2. Run `npm install`  
3. Create `.env` file with necessary environment variables  
4. Run `npm run dev` for local development  
5. Run `npm run build` for production build  

## Deployment

- Frontend hosted on Netlify  
- Netlify Edge Functions in `netlify/edge-functions`  
- Cloudflare Workers API in `cloudflare-workers/`  
- CI/CD via GitHub Actions in `.github/workflows/ci.yml`

## Project Structure

- `src/`: React frontend  
- `netlify/`: Netlify config & edge functions  
- `cloudflare-workers/`: API backend  
- `.github/`: CI pipeline  

## TODO

- Implement credits system UI and API  
- Integrate Stripe checkout  
- Add campaign management UI  
- Add auth token validation in Edge functions  
- Expand Cloudflare Workers API routes
