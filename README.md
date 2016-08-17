# tern-asyncawait

**Work in progress - not stable yet.**

Implements async/await support for Tern.

We transform the AST to replace the async and await keywords with functions
calls with equivalent types. This avoids having to modify the internals of Tern,
but is not quite as clean.

# License

MIT.
