# Contributing to OCR-PDF

Thank you for your interest in contributing to OCR-PDF! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/ocr-pdf/issues)
2. If not, create a new issue using the Bug Report template
3. Provide as much detail as possible, including steps to reproduce

### Suggesting Features

1. Check if the feature has already been suggested in [Issues](https://github.com/yourusername/ocr-pdf/issues)
2. If not, create a new issue using the Feature Request template
3. Clearly describe the feature and its benefits

### Pull Requests

1. Fork the repository
2. Create a new branch from `develop`:
   \`\`\`bash
   git checkout -b feature/your-feature-name
   \`\`\`
3. Make your changes following our coding standards
4. Test your changes thoroughly
5. Commit your changes with clear, descriptive messages:
   \`\`\`bash
   git commit -m "feat: add new OCR engine support"
   \`\`\`
6. Push to your fork:
   \`\`\`bash
   git push origin feature/your-feature-name
   \`\`\`
7. Open a Pull Request against the `develop` branch

## Development Setup

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/yourusername/ocr-pdf.git
   cd ocr-pdf
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Create `.env.local` file:
   \`\`\`bash
   BLOB_READ_WRITE_TOKEN=your_token_here
   \`\`\`

4. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Ensure type safety - avoid `any` types
- Use interfaces for object shapes
- Export types that are used across files

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use proper prop typing
- Follow the existing component structure

### Naming Conventions

- **Files**: kebab-case (e.g., `file-upload.tsx`)
- **Components**: PascalCase (e.g., `FileUpload`)
- **Functions**: camelCase (e.g., `processFile`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Add trailing commas in objects and arrays
- Run `npm run lint` before committing

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
\`\`\`
feat: add support for TIFF images
fix: resolve file upload timeout issue
docs: update README with new features
\`\`\`

## Testing

- Test all new features thoroughly
- Test with different file types and sizes
- Test error handling and edge cases
- Verify UI responsiveness on different screen sizes

## Documentation

- Update README.md if adding new features
- Add JSDoc comments for complex functions
- Update API documentation for new endpoints
- Include code examples where helpful

## Project Structure

\`\`\`
ocr-pdf/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── *.tsx             # Custom components
├── lib/                   # Utility functions
├── public/               # Static assets
└── .github/              # GitHub configuration
\`\`\`

## Questions?

If you have questions, feel free to:
- Open an issue for discussion
- Reach out to the maintainers
- Check existing documentation

Thank you for contributing to OCR-PDF!
