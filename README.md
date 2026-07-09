# CRM — Adobe Acrobat Convert to PDF

A pixel-accurate recreation of the Adobe Acrobat "Convert to PDF" interface built with a modern enterprise-grade stack.

## Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (Button, Card, NavigationMenu)
- **Framer Motion** (hover/tap animations, drag states)
- **Lucide React** (icons)
- **TanStack Table** (reusable DataTable component)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/
│   ├── features/           # Feature-specific components
│   │   └── convert-to-pdf/
│   ├── icons/              # Brand & service icons
│   ├── layout/             # Header, navigation
│   ├── sections/           # Page sections
│   └── ui/                 # shadcn/ui + shared UI (DataTable)
└── lib/
    ├── constants/          # Navigation config, etc.
    └── utils.ts            # cn() utility
```

## Scripts

| Command       | Description          |
|---------------|----------------------|
| `npm run dev` | Start dev server     |
| `npm run build` | Production build   |
| `npm run start` | Start production   |
| `npm run lint` | Run ESLint          |
