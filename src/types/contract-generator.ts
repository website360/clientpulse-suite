export interface ContractStyleConfig {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  titleFontSize: number;
  titleBold: boolean;
  paragraphBold: boolean;
  textAlign: 'left' | 'center' | 'justify';
  backgroundImage?: string;
  backgroundOpacity: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  headerLogo?: string;
  headerLogoHeight: number;
  showHeaderLine: boolean;
}

export const DEFAULT_STYLE_CONFIG: ContractStyleConfig = {
  fontFamily: 'Times New Roman',
  fontSize: 12,
  lineHeight: 1.8,
  titleFontSize: 14,
  titleBold: true,
  paragraphBold: false,
  textAlign: 'justify',
  backgroundOpacity: 0.1,
  marginTop: 40,
  marginBottom: 40,
  marginLeft: 40,
  marginRight: 40,
  headerLogoHeight: 60,
  showHeaderLine: true,
};

export interface ContractTemplate {
  id: string;
  name: string;
  serviceType: string;
  description: string;
  content: string;
  fields: ContractField[];
  styleConfig?: ContractStyleConfig;
}

export interface ContractField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'currency';
  placeholder?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: string;
}

export interface GeneratedContract {
  templateId: string;
  templateName: string;
  clientId?: string;
  clientName: string;
  fields: Record<string, string>;
  content: string;
  generatedAt: Date;
}

// Templates de contratos pré-definidos (vazio - criar templates personalizados)
export const CONTRACT_TEMPLATES: ContractTemplate[] = [];
