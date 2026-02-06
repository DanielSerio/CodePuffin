const withCodePuffin = require('../../../../dist/plugins/next.js').default;

const config = withCodePuffin({}, { failOnError: true });

(async () => {
  try {
    await config.rewrites();
    console.log('Plugin finished successfully');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
