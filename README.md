# Board Game Score Cards

Free digital score cards for your favorite board games. Track scores offline with no data sent to servers.

**[Play Now](https://rvanbaalen.github.io/boardgames/)**

## Features

- **Offline-first** - Works without an internet connection after initial load
- **Privacy-focused** - All data stays in your browser's local storage, nothing is sent to servers
- **Auto-save** - Game progress is automatically saved and restored
- **Mobile-friendly** - Responsive design works on phones, tablets, and desktops
- **Smooth animations** - Polished UI with Framer Motion animations

## Available Games

| Game | Description | Players | Duration |
|------|-------------|---------|----------|
| **[Tienduizenden](https://rvanbaalen.github.io/boardgames/tienduizenden)** | A classic Dutch dice game. Roll the dice and be the first to reach 10,000 points! | 2-6 | 30-60 min |

More games coming soon!

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- [Astro](https://astro.build/) v5 - Static site generator
- [React](https://react.dev/) v19 - UI components
- [Motion](https://motion.dev/) - Animations

## Deployment

This site automatically deploys to GitHub Pages when changes are pushed to the `main` branch via release-please.

## License

MIT
