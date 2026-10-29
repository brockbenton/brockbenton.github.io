# brockbenton.github.io

Personal site. Plain Jekyll, no theme. Deployed by `.github/workflows/deploy.yml` on push to `main`.

## Run locally

```sh
bundle install
bundle exec jekyll serve --livereload
```

Then open http://localhost:4000.

## Where things live

- `index.html`: landing page (about, experience, featured work, latest posts)
- `_data/experience.yml`: experience entries; logos go in `assets/img/logos/`
- `_projects/`: featured work (one markdown file each)
- `_posts/`: blog posts
- `assets/css/main.css`: all styles (colors and fonts are set at the top)
- `assets/js/dots.js`: the interactive dot-grid background
- `_news/`: parked, not built
