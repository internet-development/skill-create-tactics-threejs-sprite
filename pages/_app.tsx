//NOTE(jimmylee)
//Next.js app wrapper. Loads global styles.

import '@root/global.css';

import * as React from 'react';

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;
