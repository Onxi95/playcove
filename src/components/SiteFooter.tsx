import { getMessages, type Locale } from '../i18n'

export function SiteFooter({ locale }: { locale: Locale }) {
  const copy = getMessages(locale)

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <a href={locale === 'pl' ? '/pl' : '/en'} className="brand footer-brand">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>playcove</span>
        </a>
        <p>{copy.footerNote}</p>
        <span className="footer-meta">{copy.savedLocally}</span>
      </div>
    </footer>
  )
}
