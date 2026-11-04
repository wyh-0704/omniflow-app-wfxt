# 智行助手 (Smart Planner)

AI-assisted daily schedule planner with manual adjustment, personalization and insights.

## Tech Stack
- React + Vite + Tailwind CSS v4 + shadcn/ui, HashRouter
- Express backend (flat `backend/` layout), shared types in `shared/types/api.ts`
- AI via `createAIService()` in `backend/services/aiService.ts`

## Frontend Structure
- `frontend/src/App.tsx` - routes: `/` (Index, 今日行程), `/tasks` (任务库), `/insights` (效率统计), `/1091fa4a-ed53-4503-b0e7-2e9078e58a83` (preview, renders Index), `/personalization`, `*` (NotFound with links back)
- `frontend/src/pages/Index.tsx` - 今日行程：概览 hero、时间轴、今日节奏
- `frontend/src/pages/Tasks.tsx` - 任务库：新建任务、待办池、已排期
- `frontend/src/pages/Insights.tsx` - 效率统计：KPI 卡片、图表、屏蔽时段管理
- `frontend/src/pages/Personalization.tsx` - personalization settings
- `frontend/src/pages/NotFound.tsx` - wildcard recovery page
- `frontend/src/contexts/PlannerContext.tsx` - 跨页面共享的任务与屏蔽时段状态、排期动作
- `frontend/src/components/custom/` - PageShell, AppNav, Timeline, OmniflowBadge
- `frontend/src/lib/planner.ts` - scheduling logic; `frontend/src/lib/api.ts` - API client

## Guidelines
- Do not modify `frontend/src/components/ui/` or `frontend/src/index.css` wholesale.
- Always use HashRouter and register every visible link target as a route.