import { EmailIntegration } from './integrations/EmailIntegration';
import { WhatsAppIntegration } from './integrations/WhatsAppIntegration';
import { AsaasIntegration } from './integrations/AsaasIntegration';

export function IntegrationsTab() {
  return (
    <div className="space-y-6">
      <EmailIntegration />
      <WhatsAppIntegration />
      <AsaasIntegration />
    </div>
  );
}
