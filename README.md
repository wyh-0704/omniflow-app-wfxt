# 智行助手 (Smart Planner)

AI-assisted daily schedule planner with manual adjustment, personalization and insights.

## Tech Stack
- React + Vite + Tailwind CSS v4 + shadcn/ui, HashRouter
- Express backend (flat `backend/` layout), shared types in `shared/types/api.ts`
- AI via `createAIService()` in `backend/services/aiService.ts`

## Frontend Structure
- `frontend/src/App.tsx` - routes: `/` (Index), `/1091fa4a-ed53-4503-b0e7-2e9078e58a83` (preview, renders Index), `/personalization`, `*` (NotFound with links back)
- `frontend/src/pages/Index.tsx` - today timeline, task pool, insights
- `frontend/src/pages/Personalization.tsx` - personalization settings
- `frontend/src/pages/NotFound.tsx` - wildcard recovery page
- `frontend/src/components/custom/` - AppNav, TaskPanel, Timeline, InsightPanels, OmniflowBadge
- `frontend/src/lib/planner.ts` - scheduling logic; `frontend/src/lib/api.ts` - API client

## Guidelines
- Do not modify `frontend/src/components/ui/` or `frontend/src/index.css` wholesale.
- Always use HashRouter and register every visible link target as a route.
