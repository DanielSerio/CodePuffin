// Test harness that simulates Next.js calling the withCodePuffin wrapper
const withCodePuffin = require('../../../../dist/plugins/next.js').default;

const config = withCodePuffin({}, { enabled: true });

config.rewrites().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
