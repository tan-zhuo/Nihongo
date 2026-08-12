import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App, { preloadAllPages } from './App'
import i18n from './i18n'

// Prerendered HTML is produced in English (the i18n fallback); the client
// re-renders in the visitor's language after load.
//
// renderToString (not renderToPipeableStream): the streaming renderer's byte
// buffer mangles multibyte characters (NULs appear mid-kanji). renderToString
// renders Suspense fallbacks for unresolved lazy() routes, so all page modules
// are preloaded first, then rendered twice: the first pass initializes each
// lazy component (its already-loaded promise settles in a microtask), the
// second pass renders the real content.
export async function render(url: string): Promise<string> {
  await i18n.changeLanguage('en')
  await preloadAllPages()
  const pass = () =>
    renderToString(
      <StaticRouter location={url}>
        <App />
      </StaticRouter>,
    )
  pass()
  await new Promise((r) => setTimeout(r))
  return pass()
}
