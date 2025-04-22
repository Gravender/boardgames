# 🎲 Board Game Tracker

A full-featured web application for tracking board games, players, matches, scoresheets, and statistics. Built with Next.js and a PostgreSQL backend using Drizzle ORM.

## 🚀 Features

### 📊 Game and Match Stats

- Win/loss ratios, player performance, and match trends.
- Charts: Placement distribution, match durations, and win rates.
- Responsive and interactive statistics pages for both owned and shared games.

### 👥 Sharing System

- Share games, matches, players, and scoresheets via links or with friends.
- Configurable permissions (view/edit) and support for nested sharing (e.g., shared game → matches → match players).
- Share requests system with acceptance flows and expiry handling.
- Friend system for streamlined sharing and management.

### 🧑‍🤝‍🧑 Players and Teams

- Detailed player statistics including wins, matches played, and history.
- Team management during match creation.
- Shared players and linking support across user accounts.

### 📍 Locations and Groups

- Associate matches with locations and group data.
- Default locations and editable location/group pages.
- Calendar view to browse past matches by date.

### 📄 Scoresheets and Rounds

- Flexible scoring models: manual, cooperative, target score, etc.
- Multiple scoresheets per game.
- Round management with visual color indicators and player scoring.

### 📱 Cross-Platform Support

- Web app using Next.js with React 19.
- Consistent component library across platforms (ShadCN + Radix UI + Tailwind CSS).

## ⚙️ Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS, ShadCN, Radix UI
- **Backend:** tRPC, Drizzle ORM, PostgreSQL
- **Auth:** Clerk
- **Testing:** Playwright, Vitest
- **Dev Tools:** TurboRepo, PNPM, ESLint, Prettier

## 📦 Monorepo Structure

```
apps/
  - web (Next.js)
  - mobile (Expo)
packages/
  - api (tRPC routers)
  - db (Drizzle schemas)
  - ui (shared UI components)
  - shared (utils and score calculations)
```

## 📅 Changelog Highlights

- **2025-04:** Major revamp of stats pages and shared match/player handling.
- **2025-03:** Added full sharing system with linking, permissions, and friend-based access.
- **2025-02:** Improved match/team integration and dynamic score/ranking logic.
- **2025-01:** TurboRepo migration and first Expo app release.
- **2024-12:** Initial feature-rich release with support for scoresheets, locations, and dashboards.
