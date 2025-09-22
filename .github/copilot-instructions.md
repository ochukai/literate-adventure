# AI Agent Instructions for jz-web

This document provides essential guidance for AI agents working with the jz-web codebase.

## Project Overview

jz-web is a React application built with Vite, using SWC for fast refresh. The project uses modern React patterns with functional components and hooks.

### Key Technologies

- React 19.1 with functional components and hooks
- Vite 7.1 for build tooling and dev server
- Ant Design (antd) v6 alpha for UI components
- ESLint with React-specific plugins

## Development Workflow

### Common Commands

```bash
# Start development server with HMR
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

### Code Organization

- `src/` - Application source code
  - `App.jsx` - Root component
  - `main.jsx` - Application entry point
  - `assets/` - Static assets (images, etc.)

## Key Patterns and Conventions

1. **Component Structure**
   - Functional components with hooks
   - Example from `App.jsx`:
   ```jsx
   function App() {
     const [count, setCount] = useState(0)
     // ...
   }
   ```

2. **UI Components**
   - Using Ant Design components
   - Import specific components: `import { Button } from 'antd'`

3. **Module System**
   - ES modules (`type: "module"` in package.json)
   - Import CSS directly in components: `import './App.css'`

## Build and Configuration

- Vite configuration in `vite.config.js`
- Using `@vitejs/plugin-react-swc` for Fast Refresh
- ESLint configuration in `eslint.config.js`

## Future Considerations

The project is set up for TypeScript integration but currently uses JavaScript. When adding new features, consider:
- Type safety with JSDoc comments until TypeScript migration
- Following Ant Design patterns for UI consistency
- Using React hooks for state management

## Need Help?

- Refer to [Vite docs](https://vite.dev) for build-related questions
- Check [React docs](https://react.dev) for component patterns
- See [Ant Design docs](https://ant.design) for UI components