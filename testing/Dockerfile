FROM mcr.microsoft.com/playwright:v1.51.1
# Set working directory inside the container
WORKDIR /app
# Copy package.json and package-lock.json for dependency installation
COPY package*.json ./
# Install the project dependencies
RUN npm ci
# Install Playwright browsers (chromium, firefox, webkit)
RUN apt-get update && npx playwright install --with-deps
# Copy tests and config after dependency layers so test edits rebuild fast
COPY ./tests ./tests
COPY ./playwright.config.ts ./
# Default command to run tests
CMD ["npx", "playwright", "test"]

