import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageSquare, Phone, Calendar, Share2, Bell, FileText } from 'lucide-react';
import { EmailIntegration } from './integrations/EmailIntegration';
import { TelegramIntegration } from './integrations/TelegramIntegration';
import { SMSIntegration } from './integrations/SMSIntegration';
import { GoogleCalendarIntegration } from './integrations/GoogleCalendarIntegration';
import { ProjectManagementIntegration } from './integrations/ProjectManagementIntegration';
import { SlackIntegration } from './integrations/SlackIntegration';
import { ZapierIntegration } from './integrations/ZapierIntegration';
import { AccountingIntegration } from './integrations/AccountingIntegration';

export function IntegrationsTab() {
  return (
    <Tabs defaultValue="communication" className="space-y-6">
      <TabsList>
        <TabsTrigger value="communication" className="gap-2">
          <Mail className="h-4 w-4" />
          Comunicação
        </TabsTrigger>
        <TabsTrigger value="tools" className="gap-2">
          <Share2 className="h-4 w-4" />
          Ferramentas
        </TabsTrigger>
        <TabsTrigger value="accounting" className="gap-2">
          <FileText className="h-4 w-4" />
          Contabilidade
        </TabsTrigger>
      </TabsList>

      <TabsContent value="communication" className="space-y-6">
        <EmailIntegration />
        <TelegramIntegration />
        <SMSIntegration />
      </TabsContent>

      <TabsContent value="tools" className="space-y-6">
        <GoogleCalendarIntegration />
        <ProjectManagementIntegration />
        <SlackIntegration />
        <ZapierIntegration />
      </TabsContent>

      <TabsContent value="accounting" className="space-y-6">
        <AccountingIntegration />
      </TabsContent>
    </Tabs>
  );
}
