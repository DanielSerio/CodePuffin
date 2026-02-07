/** @type {import('next').NextConfig} */
import withCodePuffin from '../../dist/plugins/next.mjs';

const nextConfig = {
  // Your Next.js config here
};

export default withCodePuffin(nextConfig, {
  configPath: './puffin.json',
});
