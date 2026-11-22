import { Section } from '@/components/layout/Section';
import { SiteAccessList } from '@/components/settings/SiteAccessList';

export function SitesSection() {
  return (
    <Section
      id="sites"
      title="Site access"
      description="Access is opt-in per platform. MediaVault only reads pages on the sites you enable, and you can revoke access at any time."
    >
      <SiteAccessList />
    </Section>
  );
}
