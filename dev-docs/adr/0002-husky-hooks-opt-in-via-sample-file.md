# Husky hooks are opt-in via a committed `.sample` file, not auto-active

Husky's usual convention is that hook files committed to `.husky/` run for every
contributor automatically. Here, only `.husky/pre-commit.sample` is committed;
the real `.husky/pre-commit` is gitignored, so a hook only runs once someone
deliberately copies the sample to its real name. This trades away uniform
enforcement for individual (human or agent) control over how much friction they
want per commit — chosen specifically because contributors have differing
tolerances for how aggressive local checks should be (e.g. whether build/test runs
on every commit), and because CI (see ADR-0001) is the actual backstop regardless
of what any individual has opted into locally. The sample file documents
recommended configurations for a human vs. an AI agent working session inline.
