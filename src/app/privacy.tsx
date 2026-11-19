import { LegalPage } from '../components/LegalPage';

// TODO before launch: replace with the real Privacy Policy (and host it on a public web page).
export default function PrivacyScreen() {
  return (
    <LegalPage
      title="Privacy Policy"
      body={
        'Placeholder — the full Privacy Policy will be published here before Cultivate. launches.\n\n' +
        'In short: your library and notes belong to you. Your notes are always private. ' +
        'We store your account and library securely with our database provider, Supabase, ' +
        'and you can permanently delete your account and all your data from Settings at any time.'
      }
    />
  );
}
