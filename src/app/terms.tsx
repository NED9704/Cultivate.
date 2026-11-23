import { LegalPage } from '../components/LegalPage';
import { termsOfUse } from '../lib/legal';

// Text lives in content/legal.json (shared with the web version in docs/).
export default function TermsScreen() {
  return <LegalPage doc={termsOfUse} />;
}
