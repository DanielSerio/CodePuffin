const withCodePuffin = require('../../../../dist/plugins/next.js').default;

const config = withCodePuffin({}, { enabled: false });

(async () => {
  try {
    await config.rewrites();
    console.log('Plugin finished successfully (disabled)');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
