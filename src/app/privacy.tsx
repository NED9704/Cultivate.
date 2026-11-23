import { LegalPage } from '../components/LegalPage';
import { privacyPolicy } from '../lib/legal';

// Text lives in content/legal.json (shared with the web version in docs/).
export default function PrivacyScreen() {
  return <LegalPage doc={privacyPolicy} />;
}
